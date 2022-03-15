import React from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import { CodeOutlined, DiffOutlined, WarningOutlined } from "@ant-design/icons";

import { Table, Alert, Tag, Tooltip, Row, Col } from "antd";
import config from "../../../config";
import qs from "query-string";
import moment from "moment";
import history from "../../../history";
import SyncButton from "./SyncButton";
import PageContent from "../../../components/PageContent";
import withContext from "../../../components/hoc/withContext";
import Auth from "../../../components/Auth";
import kibanaQuery from "./kibanaQuery";

import SyncAllSectorsButton from "../../Admin/SyncAllSectorsButton";
import ErrorMsg from "../../../components/ErrorMsg";

const PAGE_SIZE = 25;

const _ = require("lodash");

const tagColors = {
  processing: "purple",
  downloading: "cyan",
  inserting: "blue",
  finished: "green",
  failed: "red",
  "in queue": "orange",
};
const getColumns = (catalogueKey) => [
  {
    title: "Source",
    dataIndex: ["sector", "dataset", "alias"],
    key: "alias",
    width: 150,
    render: (text, record) => (
      <NavLink
        to={{
          pathname: `/catalogue/${catalogueKey}/dataset/${record.sector.dataset.key}/metadata`,
        }}
      >
        {_.get(record, "sector.dataset.alias") ||
          _.get(record, "sector.dataset.title")}
      </NavLink>
    ),
  },
  {
    title: "Subject",
    dataIndex: ["sector", "subject", "name"],
    key: "subject",
    width: 100,

    render: (text, record) => {
      return (
        <React.Fragment>
          <span style={{ color: "rgba(0, 0, 0, 0.45)" }}>
            {_.get(record, "sector.subject.rank")}:{" "}
          </span>
          <NavLink
            to={{
              pathname: `/catalogue/${catalogueKey}/names`,
              search: `?q=${_.get(
                record,
                "sector.subject.name"
              )}&SECTOR_DATASET_KEY=${_.get(
                record,
                "sector.subjectDatasetKey"
              )}`,
            }}
            exact={true}
          >
            {_.get(record, "sector.subject.name")}
          </NavLink>
          {_.get(record, "sector.subject.broken") && (
            <WarningOutlined style={{ color: "red", marginLeft: "10px" }} />
          )}
        </React.Fragment>
      );
    },
  },
  {
    title: "Target",
    dataIndex: ["sector", "target", "name"],
    key: "target",
    width: 100,

    render: (text, record) => {
      return (
        <React.Fragment>
          <span style={{ color: "rgba(0, 0, 0, 0.45)" }}>
            {_.get(record, "sector.target.rank")}:{" "}
          </span>
          {_.get(record, "sector.target.id") && (
            <NavLink
              to={{
                pathname: `/catalogue/${catalogueKey}/assembly`,
                search: `?assemblyTaxonKey=${_.get(
                  record,
                  "sector.target.id"
                )}`,
              }}
              exact={true}
            >
              {_.get(record, "sector.target.name")}
            </NavLink>
          )}
          {_.get(record, "sector.target.broken") && (
            <React.Fragment>
              {_.get(record, "sector.target.name")}
              <WarningOutlined style={{ color: "red", marginLeft: "10px" }} />
            </React.Fragment>
          )}
        </React.Fragment>
      );
    },
  },
  {
    title: "Type",
    dataIndex: "type",
    key: "type",
    render: (text, record) => {
      return record.type;
    },
    width: 50,
  },
  {
    title: "State",
    dataIndex: "state",
    key: "state",
    render: (text, record) => {
      return <Tag color={tagColors[record.state]}>{record.state}</Tag>;
    },
    width: 50,
  },

  {
    title: "Attempt",
    dataIndex: "attempt",
    key: "attempt",
    width: 50,
  },
  {
    title: "Started",
    dataIndex: "started",
    key: "started",
    width: 50,
    render: (date) => {
      return date ? moment(date).format("MMMM Do, h:mm a") : "";
    },
  },
  {
    title: "Finished",
    dataIndex: "finished",
    key: "finished",
    width: 50,
    render: (date) => {
      return date ? moment(date).format("MMMM Do, h:mm a") : "";
    },
  },
  {
    title: "Diff",
    key: "diff",
    render: (text, record) =>
      record.attempt > 1 ? (
        ""
      ) : (
        <NavLink
          to={{
            pathname: `/catalogue/${catalogueKey}/sync/${record.sectorKey}/diff`,
            search:
              record.attempt > 0
                ? `?attempts=${record.attempt - 1}..${record.attempt}`
                : "",
          }}
        >
          <Tooltip title="Names diff">
            <DiffOutlined style={{ fontSize: "20px" }} />
          </Tooltip>
        </NavLink>
      ),
    width: 50,
  },
  {
    title: "Logs",
    key: "logs",
    render: (text, record) => (
      <Tooltip title="Kibana logs">
        <a href={kibanaQuery(record.sectorKey, record.attempt)} target="_blank">
          <CodeOutlined style={{ fontSize: "20px" }} />
        </a>
      </Tooltip>
    ),
    width: 50,
  },
];

class SyncTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      syncAllError: null,
      data: [],
      params: {},
      pagination: {
        pageSize: PAGE_SIZE,
        current: 1,
      },
      loading: false,
    };
  }

  componentDidMount() {
    let query = qs.parse(_.get(this.props, "location.search"));
    if (_.isEmpty(query)) {
      query = { limit: 25, offset: 0 };
    }

    this.setState(
      {
        pagination: {
          pageSize: query.limit || PAGE_SIZE,
          current:
            Number(query.offset || 0) / Number(query.limit || PAGE_SIZE) + 1,
        },
      },
      () => this.getData(query)
    );
  }

  componentDidUpdate = (prevProps) => {
    if (
      _.get(prevProps, "match.params.catalogueKey") !==
      _.get(this.props, "match.params.catalogueKey")
    ) {
      this.setState(
        {
          pagination: {
            pageSize: PAGE_SIZE,
            current: 1,
          },
        },
        () => this.getData({ limit: 25, offset: 0 })
      );
    }
  };

  getData = (params) => {
    this.setState({ loading: true, params });
    const {
      match: {
        params: { catalogueKey },
      },
    } = this.props;
    history.push({
      pathname: `/catalogue/${catalogueKey}/sector/sync`,
      search: `?${qs.stringify(params)}`,
    });
    axios(
      `${config.dataApi}dataset/${catalogueKey}/sector/sync?${qs.stringify(
        params
      )}`
    )
      .then((res) => {
        const promises =
          res.data.result && _.isArray(res.data.result)
            ? res.data.result.map((sync) =>
                axios(
                  `${config.dataApi}dataset/${catalogueKey}/sector/${sync.sectorKey}`
                )
                  .then((sector) => {
                    sync.sector = sector.data;
                    sync._id = `${sync.sectorKey}_${sync.attempt}`;
                  })
                  .then(() =>
                    axios(
                      `${config.dataApi}dataset/${sync.sector.subjectDatasetKey}`
                    )
                  )
                  .then((res) => {
                    sync.sector.dataset = res.data;
                  })
              )
            : [];

        return Promise.all(promises).then(() => res);
      })
      .then((res) => {
        const pagination = { ...this.state.pagination };
        pagination.total = res.data.total;

        this.setState({
          loading: false,
          data: res.data.result,
          err: null,
          pagination,
        });
      })
      .catch((err) => {
        this.setState({ loading: false, error: err, data: [] });
      });
  };

  handleTableChange = (pagination, filters, sorter) => {
    const pager = { ...this.state.pagination, ...pagination };
    pager.current = pagination.current;

    this.setState({
      pagination: pager,
    });

    let query = _.merge(this.state.params, {
      limit: pager.pageSize,
      offset: (pager.current - 1) * pager.pageSize,
      ...filters,
    });
    if (filters.state && _.get(filters, "state.length")) {
      query.state = filters.state;
    } else {
      query.state = this.props.importState;
    }

    this.getData(query);
  };

  render() {
    const {
      data,
      error,
      syncAllError,
      params: { sectorKey },
    } = this.state;
    const { user, sectorImportState } = this.props;
    const {
      match: {
        params: { catalogueKey },
      },
    } = this.props;
    const columns = Auth.canEditDataset({key: catalogueKey}, user)
      ? [
          ...getColumns(catalogueKey),
          {
            title: "Action",
            dataIndex: "",
            key: "x",
            width: 50,
            render: (record) =>
              record.job === "SectorSync" ? (
                <SyncButton key={record.datasetKey} record={record} />
              ) : (
                ""
              ),
          },
        ]
      : getColumns(catalogueKey);

    columns[4].filters = sectorImportState.map((i) => ({
      text: _.startCase(i),
      value: i,
    }));

    return (
      <PageContent>
        {error && <Alert message={error.message} type="error" />}
        {syncAllError && (
          <Alert description={<ErrorMsg error={syncAllError} />} type="error" />
        )}

        {!sectorKey && Auth.canEditDataset({key: catalogueKey}, user) && (
          <SyncAllSectorsButton
            catalogueKey={catalogueKey}
            onError={(err) => this.setState({ syncAllError: err })}
            onSuccess={() => this.setState({ syncAllError: null })}
          />
        )}
        {sectorKey && (
          <Row>
            <Col>
              <h1>Imports for sector {sectorKey}</h1>{" "}
              <a onClick={() => this.getData({ limit: 25, offset: 0 })}>
                {" "}
                Show imports for all sectors
              </a>
            </Col>
            <Col></Col>
          </Row>
        )}
        {!error && (
          <Table
            scroll={{ x: 1000 }}
            size="small"
            loading={this.state.loading}
            columns={columns}
            dataSource={data}
            pagination={this.state.pagination}
            onChange={this.handleTableChange}
            rowKey="_id"
            expandedRowRender={(record) => {
              if (record.state === "failed") {
                return <Alert message={record.error} type="error" />;
              } else if (record.state === "finished") {
                return (
                  <React.Fragment>
                    <Tag key="speciesCount" color="blue">
                      Species Count: {_.get(record, `taxaByRankCount.species`)}
                    </Tag>
                    {[
                      "taxonCount",
                      "synonymCount",
                      "referenceCount",
                      "distributionCount",
                      "descriptionCount",
                      "vernacularCount",
                      "mediaCount",
                    ].map((c) =>
                      !isNaN(_.get(record, `${c}`)) ? (
                        <Tag key={c} color="blue">
                          {_.startCase(c)}: {_.get(record, `${c}`)}
                        </Tag>
                      ) : (
                        ""
                      )
                    )}
                  </React.Fragment>
                );
              } else return null;
            }}
          />
        )}
      </PageContent>
    );
  }
}

const mapContextToProps = ({ user, sectorImportState, catalogueKey }) => ({
  user,
  sectorImportState,
  catalogueKey,
});

export default withContext(mapContextToProps)(SyncTable);
