import React from "react";
import { SyncOutlined, WarningFilled, CopyOutlined } from "@ant-design/icons";
import {
  notification,
  Tag,
  Popconfirm,
  Button,
  Popover,
  Tooltip,
  message,
} from "antd";
import { NavLink, withRouter } from "react-router-dom";
import PopconfirmMultiOption from "../../../components/PopconfirmMultiOption";
import _ from "lodash";
import axios from "axios";
import config from "../../../config";
import { ColTreeContext } from "./ColTreeContext";
import Sector from "./Sector";
import DecisionTag from "../../WorkBench/DecisionTag";
import AddChildModal from "./AddChildModal";
import EditTaxonModal from "./EditTaxonModal";
import SpeciesEstimateModal from "./SpeciesEstimateModal";
import TaxonSources from "./TaxonSources";
import withContext from "../../../components/hoc/withContext";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { CanEditDataset } from "../../../components/Auth/hasAccess";

import history from "../../../history";

class ColTreeNode extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      style: {},
      decision: this.props.taxon.decision,
      provisional: this.props.taxon.status === "provisionally accepted",
      popOverVisible: false,
      childModalVisible: false,
      editTaxonModalVisible: false,
      estimateModalVisible: false,
    };
  }

  setMode = (mode) => {
    this.setState({ mode });
  };

  deleteTaxon = (taxon) => {
    axios
      .delete(`${config.dataApi}dataset/${taxon.datasetKey}/taxon/${taxon.id}`)
      .then(() => {
        this.props.reloadSelfAndSiblings();
        notification.open({
          message: "Taxon deleted",
          description: `${taxon.name} was deleted from the assembly`,
        });
      })
      .catch((err) => {
        this.setState({ error: err });
      });
  };

  deleteTaxonBatch = (taxa) => {
    Promise.allSettled(
      taxa.map((taxon) =>
        axios.delete(
          `${config.dataApi}dataset/${taxon.datasetKey}/taxon/${taxon.id}`
        )
      )
    ).then((res) => {
      const errors = res.filter((r) => r.status === "rejected");
      if (errors.length > 0) {
        alert(
          `There were ${errors.length} errors out of ${taxa.length} deletions. Please reload trees and inspect carefully.`
        );
      }
      this.props.reloadSelfAndSiblings();
      notification.open({
        message: "Taxa deleted",
        description: `${
          taxa.length - errors.length
        } were deleted from the assembly`,
      });
    });
  };

  deleteTaxonRecursiveBatch = (taxa) => {
    Promise.allSettled(
      taxa.map((taxon) =>
        axios.delete(
          `${config.dataApi}dataset/${
            taxon.datasetKey
          }/tree/${encodeURIComponent(taxon.id)}`
        )
      )
    ).then((res) => {
      const errors = res.filter((r) => r.status === "rejected");
      if (errors.length > 0) {
        alert(
          `There were ${errors.length} errors out of ${taxa.length} deletions. Please reload trees and inspect carefully.`
        );
      }
      this.props.reloadSelfAndSiblings();
      notification.open({
        message: "Taxa deleted",
        description: `${
          taxa.length - errors.length
        } were deleted recursively from the assembly`,
      });
    });
  };

  deleteTaxonRecursive = (taxon) => {
    axios
      .delete(
        `${config.dataApi}dataset/${taxon.datasetKey}/tree/${encodeURIComponent(
          taxon.id
        )}`
      )
      .then(() => {
        this.props.reloadSelfAndSiblings();
        notification.open({
          message: "Taxon deleted",
          description: `${taxon.name} was deleted recursively from the assembly`,
        });
      })
      .catch((err) => {
        this.setState({ error: err });
      });
  };
  setProvisional = (provisional, taxon) => {
    const { reloadSelfAndSiblings } = this.props;
    this.setState({ provisional });
    axios(`${config.dataApi}dataset/${taxon.datasetKey}/taxon/${taxon.id}`)
      .then((res) => res.data)
      .then((tx) =>
        axios.put(`${config.dataApi}dataset/${tx.datasetKey}/taxon/${tx.id}`, {
          ...tx,
          status: provisional ? "provisionally accepted" : "accepted",
        })
      )
      .then((res) => {
        reloadSelfAndSiblings();
      })
      .catch((err) => {
        this.setState({ error: err });
      });
  };

  cancelChildModal = () => {
    const { reloadChildren } = this.props;
    reloadChildren().then(() => this.setState({ childModalVisible: false }));
  };

  cancelEditTaxonModal = () => {
    const { reloadSelfAndSiblings } = this.props;

    this.setState({ editTaxonModalVisible: false }, reloadSelfAndSiblings);
  };

  cancelEstimateModal = () => {
    const { reloadSelfAndSiblings } = this.props;

    this.setState({ estimateModalVisible: false }, reloadSelfAndSiblings);
  };
  getTaxonUrl = (selectedSourceDatasetKey) => {
    const { location } = this.props;
    return (
      location.pathname.split(`dataset/${selectedSourceDatasetKey}`)[0] +
      `dataset/${selectedSourceDatasetKey}/taxon/`
    );
  };
  render = () => {
    const {
      taxon,
      taxon: { sector, datasetSectors },
      treeType,
      isUpdating,
      getTaxonomicStatusColor,
      catalogueKey,
      dataset,
    } = this.props;
    const hasDatasetSectors = datasetSectors && ( sector && sector.subjectDatasetKey ? Object.keys(_.omit(datasetSectors, [sector.subjectDatasetKey])).length > 0 : true)

    const { childModalVisible, editTaxonModalVisible, estimateModalVisible, decision } =
      this.state;

    const releaseKey =
      _.get(dataset, "origin") === "release" ? dataset.key : null;
    return (
      <div>
        {childModalVisible && (
          <AddChildModal
            onCancel={this.cancelChildModal}
            onSuccess={this.cancelChildModal}
            parent={taxon}
          />
        )}
        {editTaxonModalVisible && (
          <EditTaxonModal
            onCancel={this.cancelEditTaxonModal}
            onSuccess={this.cancelEditTaxonModal}
            taxon={taxon}
          />
        )}
        {estimateModalVisible && (
          <SpeciesEstimateModal
            onCancel={this.cancelEstimateModal}
            onSuccess={this.cancelEstimateModal}
            taxon={taxon}
            catalogueKey={catalogueKey}
          />
        )}

        <ColTreeContext.Consumer>
          {({ mode, selectedSourceDatasetKey, selectedAssemblyTreeNodes }) => {
            const taxonIsInSelectedNodes =
              selectedAssemblyTreeNodes &&
              selectedAssemblyTreeNodes.length > 1 &&
              selectedAssemblyTreeNodes.find((n) => n.taxon.id === taxon.id);
            return (
              <React.Fragment>
                {mode === "modify" && treeType === "CATALOGUE" && (
                  <Popover
                    content={
                      taxon.name !== "Not assigned" ? (
                        <React.Fragment>
                          {!taxonIsInSelectedNodes && (
                            <React.Fragment>
                              {" "}
                              <Button
                                style={{ width: "100%" }}
                                type="primary"
                                onClick={() => {
                                  history.push(
                                    `/catalogue/${catalogueKey}/taxon/${taxon.id}`
                                  );
                                }}
                              >
                                Show taxon
                              </Button>
                              <br />
                              <CanEditDataset dataset={{ key: catalogueKey }}>
                                <Button
                                  style={{ marginTop: "8px", width: "100%" }}
                                  type="primary"
                                  onClick={() =>
                                    this.setState({
                                      childModalVisible: true,
                                      popOverVisible: false,
                                    })
                                  }
                                >
                                  Add child
                                </Button>
                                <br />
                                <Button
                                  style={{ marginTop: "8px", width: "100%" }}
                                  type="danger"
                                  onClick={() =>
                                    this.setState({
                                      editTaxonModalVisible: true,
                                      popOverVisible: false,
                                    })
                                  }
                                >
                                  Edit taxon
                                </Button>
                                <br />
                                <Button
                                  type="danger"
                                  style={{ marginTop: "8px", width: "100%" }}
                                  onClick={() => this.deleteTaxon(taxon)}
                                >
                                  Delete taxon
                                </Button>
                                <br />
                                <Button
                                  type="danger"
                                  style={{ marginTop: "8px", width: "100%" }}
                                  onClick={() =>
                                    this.deleteTaxonRecursive(taxon)
                                  }
                                >
                                  Delete subtree
                                </Button>
                                <br />
                              </CanEditDataset>
                              <Button
                                style={{ marginTop: "8px", width: "100%" }}
                                type="primary"
                                onClick={() =>
                                  this.setState({
                                    estimateModalVisible: true,
                                    popOverVisible: false,
                                  })
                                }
                              >
                                Estimates
                              </Button>
                            </React.Fragment>
                          )}
                          {taxonIsInSelectedNodes && (
                            <React.Fragment>
                              <Button
                                type="danger"
                                style={{ marginTop: "8px", width: "100%" }}
                                onClick={() =>
                                  this.deleteTaxonBatch(
                                    selectedAssemblyTreeNodes.map(
                                      (n) => n.taxon
                                    )
                                  )
                                }
                              >
                                {`Delete ${selectedAssemblyTreeNodes.length} taxa`}
                              </Button>
                              <br />
                              <Button
                                type="danger"
                                style={{ marginTop: "8px", width: "100%" }}
                                onClick={() =>
                                  this.deleteTaxonRecursiveBatch(
                                    selectedAssemblyTreeNodes.map(
                                      (n) => n.taxon
                                    )
                                  )
                                }
                              >
                                {`Delete subtrees for ${selectedAssemblyTreeNodes.length} taxa`}
                              </Button>
                            </React.Fragment>
                          )}
                        </React.Fragment>
                      ) : (
                        <p>
                          This is a placeholder node for taxa that are not
                          assigned to any <strong>{taxon.rank}</strong>.
                        </p>
                      )
                    }
                    title="Options"
                    visible={this.state.popOverVisible}
                    onVisibleChange={() =>
                      this.setState({
                        popOverVisible: !this.state.popOverVisible,
                      })
                    }
                    trigger="contextMenu"
                    placement="bottom"
                  >
                    <Popconfirm
                      visible={this.props.confirmVisible}
                      title={this.props.confirmTitle}
                      onConfirm={this.props.onConfirm}
                      onCancel={this.props.onCancel}
                    >
                      <span style={{ color: "rgba(0, 0, 0, 0.45)" }}>
                        {taxon.rank}:{" "}
                      </span>
                      <span
                        dangerouslySetInnerHTML={{ __html: taxon.labelHtml }}
                      />
                      {mode === "modify" && taxon.estimate && (
                        <span>
                          {" "}
                          • {taxon.estimate.toLocaleString("en-GB")} est. spp.{" "}
                          {taxon.estimates.length
                            ? `(${taxon.estimates.length.toLocaleString(
                                "en-GB"
                              )} ${
                                taxon.estimates.length > 1
                                  ? "estimates"
                                  : "estimate"
                              })`
                            : ""}
                        </span>
                      )}
                      {isUpdating && (
                        <span>
                          {" "}
                          <SyncOutlined spin />
                        </span>
                      )}
                      {taxon.status === "provisionally accepted" && (
                        <React.Fragment>
                          {" "}
                          •{" "}
                          <Tag
                            color={getTaxonomicStatusColor(taxon.status)}
                            style={{ marginRight: 0 }}
                          >
                            prov.
                          </Tag>
                        </React.Fragment>
                      )}
                    </Popconfirm>
                  </Popover>
                )}

                {((mode !== "modify" && treeType === "CATALOGUE") ||
                  treeType === "SOURCE") && (
                  <PopconfirmMultiOption
                    visible={this.props.confirmVisible}
                    title={this.props.confirmTitle}
                    onConfirm={this.props.onConfirm}
                    actions={this.props.actions}
                    onCancel={this.props.onCancel}
                  >
                    <div>
                      <span>
                        <span style={{ color: "rgba(0, 0, 0, 0.45)" }}>
                          {taxon.rank}:{" "}
                        </span>
                        <span
                            dangerouslySetInnerHTML={{
                              __html: taxon.labelHtml,
                            }}
                          />
                        <CopyToClipboard
                          text={taxon.name}
                          onCopy={() =>
                            message.info(`Copied "${taxon.name}" to clipboard`)
                          }
                        >
                          <CopyOutlined style={{fontSize: "10px", marginLeft: "4px"}}/>
                        </CopyToClipboard>
                      </span>

                      {!_.isUndefined(taxon.speciesCount) && (
                        <span>
                          {" "}
                          • {taxon.speciesCount}{" "}
                          {!_.isUndefined(taxon.speciesEstimate) && (
                            <span> of {taxon.speciesEstimate} est. </span>
                          )}
                          living species
                        </span>
                      )}
                      {isUpdating && (
                        <span>
                          {" "}
                          <SyncOutlined spin />
                        </span>
                      )}
                      {taxon.status === "provisionally accepted" && (
                        <React.Fragment>
                          {" "}
                          •{" "}
                          <Tag
                            color={getTaxonomicStatusColor(taxon.status)}
                            style={{ marginRight: 0 }}
                          >
                            prov.
                          </Tag>
                        </React.Fragment>
                      )}
                      {taxon.datasetKey === catalogueKey &&
                        (!datasetSectors || _.isEmpty(datasetSectors)) &&
                        !sector && (
                          <Tooltip title="No sectors">
                            <WarningFilled
                              style={{ marginLeft: "6px", color: "wheat" }}
                            />
                          </Tooltip>
                        )}
                      {datasetSectors && !_.isEmpty(datasetSectors) && (
                        <span>
                        <span> • </span>
                        <TaxonSources
                          datasetSectors={datasetSectors}
                          taxon={taxon}
                          releaseKey={releaseKey}
                          catalogueKey={catalogueKey}
                        />
                        </span>
                      )}
                      {sector && mode !== "modify" && (
                        <span>
                          <span> • </span>
                          <Sector
                            {...this.props}
                            selectedSourceDatasetKey={selectedSourceDatasetKey}
                            decisionCallback={decision => this.setState({decision})}
                          />
                        </span>
                      )}
                      {decision && (
                        <span>
                          <span> • </span>
                          <DecisionTag
                            {...this.props}
                            decision={decision}
                            deleteCallback={() => this.setState({decision: null})}
                          />
                        </span>
                      )}
                    </div>
                  </PopconfirmMultiOption>
                )}
                {treeType === "readOnly" && (
                  <div>
                    <span
                    /*                   onContextMenu={()=> {
                    const uri = `${this.getTaxonUrl(selectedSourceDatasetKey)}${taxon.id}`
                    const win = window.open(uri, '_blank');
                    win.focus();
                  }} */
                    >
                      <NavLink
                        to={{
                          pathname: `${this.getTaxonUrl(
                            selectedSourceDatasetKey
                          )}${encodeURIComponent(taxon.id)}`,
                        }}
                        exact={true}
                      >
                        <span style={{ color: "rgba(0, 0, 0, 0.45)" }}>
                          {taxon.rank}:{" "}
                        </span>
                        <span
                          dangerouslySetInnerHTML={{
                            __html: taxon.labelHtml,
                          }}
                        />
                      </NavLink>
                    </span>
                    {taxon.estimate && (
                      <span>
                        {" "}
                        • {taxon.estimate.toLocaleString("en-GB")} est. spp.{" "}
                        {taxon.estimates.length
                          ? `(${taxon.estimates.length.toLocaleString(
                              "en-GB"
                            )} ${
                              taxon.estimates.length > 1
                                ? "estimates"
                                : "estimate"
                            })`
                          : ""}
                      </span>
                    )}
                    

                    {taxon.status === "provisionally accepted" && (
                      <React.Fragment>
                        {" "}
                        •{" "}
                        <Tag
                          color={getTaxonomicStatusColor(taxon.status)}
                          style={{ marginRight: 0 }}
                        >
                          prov.
                        </Tag>
                      </React.Fragment>
                    )}
                    {(sector || hasDatasetSectors) && <span> • </span>}
                    {sector && (
                      <span>
                        <NavLink
                          to={{
                            pathname: releaseKey
                              ? `/dataset/${releaseKey}/source/${sector.dataset.key}`
                              : `/dataset/${sector.dataset.key}/about`,
                          }}
                          exact={true}
                        >
                          {" "}
                          <span style={hasDatasetSectors ? {fontWeight: 'bold', fontSize: "11px"} : { fontSize: "11px" }} >
                            {sector.dataset.alias || sector.dataset.key}{hasDatasetSectors && ", "}
                          </span>
                        </NavLink>
                      </span>
                    )}
                    {hasDatasetSectors && (
                      <TaxonSources
                        datasetSectors={sector && sector.subjectDatasetKey ? _.omit(datasetSectors, [sector.subjectDatasetKey]) : datasetSectors}
                        taxon={taxon}
                        releaseKey={releaseKey}
                        catalogueKey={catalogueKey}
                      />
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          }}
        </ColTreeContext.Consumer>
      </div>
    );
  };
}

const mapContextToProps = ({ getTaxonomicStatusColor, catalogueKey }) => ({
  getTaxonomicStatusColor,
  catalogueKey,
});

export default withContext(mapContextToProps)(withRouter(ColTreeNode));
