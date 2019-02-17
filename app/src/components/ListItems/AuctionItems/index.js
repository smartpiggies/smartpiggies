import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

let uintArray = [
  "Start Block",
  "Expiry Block",
  "Start Amount",
  "Reserve Amount",
  "Time Step",
  "Price Step",
  "Active"
]

class AuctionItems extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {
      startBlock: '',
      expiryBlock: '',
      startPrice: '',
      reservePrice: '',
      timeStep: '',
      priceStep: '',
      auctionActive: ''
    }
  }

  componentDidMount() {
    if (this.props.item.length === 8) {
      this.setState({
        startBlock: this.props.item[0],
        expiryBlock: this.props.item[1],
        startPrice: this.props.item[2],
        reservePrice: this.props.item[3],
        timeStep: this.props.item[4],
        priceStep: this.props.item[5],
        auctionActive: this.props.item[6]
      })
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.item !== prevProps.item) {
      if (this.props.item.length === 8) {
        this.setState({
          startBlock: this.props.item[0],
          expiryBlock: this.props.item[1],
          startPrice: this.props.item[2],
          reservePrice: this.props.item[3],
          timeStep: this.props.item[4],
          priceStep: this.props.item[5],
          auctionActive: this.props.item[6]
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
              {uintArray[0]}
            </TableCell>
            <TableCell align="right">
              {this.state.startBlock}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="left">
              {uintArray[1]}
            </TableCell>
            <TableCell align="right">
              {this.state.expiryBlock}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[2]}
          </TableCell>
            <TableCell align="right">
              {this.state.startPrice}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[3]}
          </TableCell>
            <TableCell align="right">
              {this.state.reservePrice}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[4]}
          </TableCell>
            <TableCell align="right">
              {this.state.timeStep}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[5]}
          </TableCell>
            <TableCell align="right">
              {this.state.priceStep}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[6]}
          </TableCell>
            <TableCell align="right">
              {this.state.auctionActive.toString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    )
  }
}

AuctionItems.contextTypes = {
  drizzle: PropTypes.object
}

export default drizzleConnect(AuctionItems)
