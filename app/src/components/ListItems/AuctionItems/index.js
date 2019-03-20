/**
This application is for use with SmartPiggies.

SmartPiggies is an open source standard for
a free peer to peer global derivatives market.

Copyright (C) 2019, Arief, Algya, Lee

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/
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
  "Active Auction"
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
