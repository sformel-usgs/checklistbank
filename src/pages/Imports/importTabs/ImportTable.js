import React from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { NavLink } from "react-router-dom";
import { CodeOutlined, DiffOutlined } from '@ant-design/icons';

import { Table, Alert, Tag, Tooltip } from "antd";
import config from "../../../config";
import qs from "query-string";
import moment from "moment";
import history from "../../../history";
import ErrorMsg from "../../../components/ErrorMsg"
import ImportButton from './ImportButton'
import PageContent from '../../../components/PageContent'
import withContext from '../../../components/hoc/withContext'
import Auth from '../../../components/Auth'
import ImportMetrics from '../../../components/ImportMetrics'
import kibanaQuery from './kibanaQuery'
import {
  UploadOutlined,
  DownloadOutlined
} from "@ant-design/icons";

const _ = require("lodash");

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 }
  }
};
const tagColors = {
  'processing': 'purple',
  'downloading': 'cyan',
  'inserting': 'blue',
  'finished': 'green',
  'released': 'green',
  'failed': 'red',
  'waiting': 'orange'
}


class ImportTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      params: {},
      pagination: {
        pageSize: 10,
        current: 1
      },
      loading: false,
      defaultColumns : [
        {
          title: "Title",
          dataIndex: ["dataset", "title"],
          key: "title",
          render: (text, record) => 
            <NavLink
              to={{ pathname: `/dataset/${record.datasetKey}/names` }}
              exact={true}
            >
              {_.get(record, 'dataset.alias') || _.get(record, 'dataset.title')}
            </NavLink>,
          width: 150
        },
        {
          title: "State",
          dataIndex: "state",
          key: "state",
          render: (text, record) => <Tag color={tagColors[record.state]}>{record.state}</Tag>,
          width: 50
        },
        {
          title: "Job",
          dataIndex: "job",
          key: "job",
          render: (text, record) => 
            <React.Fragment>
              <span>{_.get(record, 'job')}</span>&nbsp;
              {_.get(record, 'upload') ? <UploadOutlined/> : <DownloadOutlined/>}
            </React.Fragment>,
          width: 50
        },
        {
          title: "Data Format",
          dataIndex: "format",
          key: "dataFormat",
          width: 50
        },
        {
          title: "Attempt",
          dataIndex: "attempt",
          key: "attempt",
          width: 50
        },
        {
          title: "Started",
          dataIndex: "started",
          key: "started",
          width: 50,
          render: date => {
            return (date) ? moment(date).format('MMMM Do, h:mm a') : '';
          }
        },
        {
          title: "Finished",
          dataIndex: "finished",
          key: "finished",
          width: 50,
          render: date => {
            return (date) ?  moment(date).format('MMMM Do, h:mm a') : '';
          }
        },
        {
          title: "Diff",
          key: "diff",
          render: (text, record) => (
            record.attempt < 2 ? "" : <NavLink
              to={{
                pathname: `/dataset/${record.datasetKey}/diff`,
                search:
                  record.attempt > 0
                    ? `?attempts=${record.attempt - 1}..${record.attempt}`
                    : ""
              }}
            >
              <Tooltip title="Names diff">
                <DiffOutlined style={{fontSize: '20px'}} />
              </Tooltip>
            </NavLink>
          ),
          width: 50
        },        
        {
          title: "Logs",
          key: "logs",
          render: (text, record) => 
          <Tooltip title="Kibana logs"><a href={kibanaQuery(record.datasetKey)} target="_blank" ><CodeOutlined style={{fontSize: '20px'}} /></a></Tooltip>,
          width: 50
        }
        
      ]
    };
  }

  componentDidMount() {
    const { importState, section } = this.props;
    let query = qs.parse(_.get(this.props, "location.search"));
    if (_.isEmpty(query)) {
      query = { limit: 10, offset: 0, state: (importState.length > 0 || section === 'finished') ? importState : ["downloading", "processing", "inserting", "indexing", "analyzing"] };
    }
    if(query.state){
      this.updateStatusQuery(query)
     }

     this.setState({ params: query, pagination: {
      pageSize: query.limit,
      current: (Number(query.offset) / Number(query.limit)) +1
      
    } }, this.getData);

    if(this.props.section === 'running'){
     this.timer = setInterval(()=>{

        this.getData()
      }, 3000)
    }

  }

  componentWillUnmount(){
    if(this.props.section === 'running'){ clearInterval(this.timer)};

  }

  refresh = () => {
    const { importState, section } = this.props;
    let query = qs.parse(_.get(this.props, "location.search"));
    if (_.isEmpty(query)) {
      query = { limit: 10, offset: 0, state: (importState.length > 0 || section === 'finished') ? importState : ["downloading", "processing", "inserting", "indexing", "analyzing"] };
    }
    if(query.state){
      this.updateStatusQuery(query)
     }

     this.setState({ params: query, pagination: {
      pageSize: query.limit,
      current: (Number(query.offset) / Number(query.limit)) +1
      
    } }, this.getData);
   // this.getData(query);
  }

  getData = () => {
    const { section } = this.props;
    const { params } = this.state;
    this.setState({ loading: true });
    
    axios(`${config.dataApi}importer?${qs.stringify(params)}`)
      .then(res => {

        const promises = (res.data.result && _.isArray(res.data.result)) ? res.data.result.map( imp => 
         
            axios(`${config.dataApi}dataset/${imp.datasetKey}`).then(
              dataset => {
                imp.dataset = dataset.data;
                imp._id = `${imp.datasetKey}_${imp.attempt}`
              }
            )
          
        ) : []

        return Promise.all(promises).then(() => res);
      })

      .then(res => {
        const pagination = { ...this.state.pagination };
        pagination.total = res.data.total;

        this.setState({
          loading: false,
          data: res.data.result ? res.data.result.slice(0, Number(pagination.pageSize)) : [], // Ant table act quite odd if more records than pageSize is in data, to be fixed properly in https://github.com/Sp2000/colplus-backend/issues/462
          err: null,
          pagination
        }, () => {
          history.push({
      pathname: `/imports/${section}`,
      search: `?${qs.stringify(params)}`
    });
        });
      })
      .catch(err => {
        this.setState({ loading: false, error: err, data: [] });
      });
  };



  updateStatusQuery = (query) => {
    const {defaultColumns} = this.state;
    let catColumn = _.find(defaultColumns, (c)=>{
      return c.key === 'state'
    });
    let filter = (typeof query.state === 'string') ? [query.state] : query.state;
    catColumn.filteredValue = filter
  }

  handleTableChange = (pagination, filters, sorter) => {
    const pager = { ...this.state.pagination };
    pager.current = pagination.current;

    this.setState({
      pagination: pager
    });
    
    let query = _.merge(this.state.params, {
      limit: pager.pageSize,
      offset: (pager.current - 1) * pager.pageSize,
      ...filters
    });
    if(filters.state && _.get(filters, 'state.length')){
      query.state = filters.state
      
    } else {
      query.state = this.props.importState
    }
    this.updateStatusQuery(query)
    this.setState({pagination: pager, params: query}, this.getData)
   // this.getData(query);
  };


  render() {
    const { data, loading, error, defaultColumns } = this.state;
    const { section, importState, user } = this.props;
    const columns = (Auth.isAuthorised(user, ['editor', 'admin'])) ? [ ...defaultColumns, {
      title: "Action",
      dataIndex: "",
      key: "x",
      width: 50,
      render: record => (
       _.get(record, 'dataset.origin') === 'external' ? <ImportButton key={record.datasetKey} record={record} ></ImportButton> : ''
      )
    }] : defaultColumns;

    if(section === 'finished'){
      columns[1].filters = importState.map(i => ({text: _.startCase(i), value: i}))
    }


    return (
      <PageContent>
        {error && <Alert message={<ErrorMsg error={error}/>} type="error" />}
        {!error && (
          <Table
            scroll={{x: 1000}}
            size="small"
            columns={columns}
            dataSource={data}
            pagination={this.state.pagination}
            onChange={this.handleTableChange}
            rowKey="_id"
            expandedRowRender={section === "finished" ? record => {
              if(record.state ==='failed'){
                return <Alert message={record.error} type="error" />
              } else {
                return <ImportMetrics data={record}></ImportMetrics>
              }
            } :null     
            } 
          />
        )}
      </PageContent>
    );
  }
}

const mapContextToProps = ({ user, catalogueKey }) => ({ user, catalogueKey });

export default withContext(mapContextToProps)(ImportTable);
