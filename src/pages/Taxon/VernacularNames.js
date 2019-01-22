import React from "react";
import { Table } from "antd";
import _ from "lodash";

const columns = [
  {
    title: "name",
    dataIndex: "name",
    key: "name"
  },
  {
    title: "latin",
    dataIndex: "latin",
    key: "latin"
  },
  {
    title: "language",
    dataIndex: "language",
    key: "language"
  },
  {
    title: "country",
    dataIndex: "country",
    key: "country"
  }
];

class VernacularNamesTable extends React.Component {
  render() {
    const { data } = this.props;
    return (
      <Table
        className="colplus-taxon-page-list"
        columns={columns}
        dataSource={data}
        rowKey="verbatimKey"
        pagination={false}
        size="middle"
      />
    );
  }
}

export default VernacularNamesTable;
