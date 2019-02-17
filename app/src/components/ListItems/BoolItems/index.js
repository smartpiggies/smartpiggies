import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

let boolArray = [
  "RFP",
  "Style",
  "Direction",
  "Cleared"
]

class BoolItem extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {
      rfp: '',
      style: '',
      direction: '',
      cleared: ''
    }
  }

  componentDidMount() {
    if (this.props.item.length === 4) {
      this.setState({
        rfp: (this.props.item[0] ? 'requested' : 'not requested'),
        style: (this.props.item[1] ? 'euro' : 'american' ),
        direction: (this.props.item[2] ? 'put' : 'call'),
        cleared: (this.props.item[3] ? 'yes' : 'no')
      })
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.item !== prevProps.item) {
      if (this.props.item.length === 4) {
        this.setState({
          rfp: (this.props.item[0] ? 'requested' : 'no requested'),
          style: (this.props.item[1] ? 'euro' : 'american' ),
          direction: (this.props.item[2] ? 'put' : 'call'),
          cleared: (this.props.item[3] ? 'yes' : 'no')
        })
      }
    }
  }

  render() {

    return (
      <div>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell align="left">
              {boolArray[0]}
            </TableCell>
            <TableCell align="right">
              {this.state.rfp}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="left">
              {boolArray[1]}
            </TableCell>
            <TableCell align="right">
              {this.state.style}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {boolArray[2]}
          </TableCell>
            <TableCell align="right">
              {this.state.direction}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {boolArray[3]}
          </TableCell>
            <TableCell align="right">
              {this.state.cleared}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    )
  }
}

BoolItem.contextTypes = {
  drizzle: PropTypes.object
}

export default drizzleConnect(BoolItem)
