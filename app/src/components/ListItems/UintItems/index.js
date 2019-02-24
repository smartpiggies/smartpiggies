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
  "Collateral Amount",
  "Lot Size",
  "Strike Price",
  "Expiry",
  "SettlementPrice",
  "Requested Collateral",
  "Collateral Decimals"
]

class UintItems extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {
      collateral: '',
      lotSize: '',
      strikePrice: '',
      expiry: '',
      settlementPrice: '',
      reqCollateral: '',
      collateralDecimals: ''
    }
  }

  componentDidMount() {
    if (this.props.item.length === 7) {
      this.setState({
        collateral: this.props.item[0],
        lotSize: this.props.item[1],
        strikePrice: this.props.item[2],
        expiry: this.props.item[3],
        settlementPrice: this.props.item[4],
        reqCollateral: this.props.item[5],
        collateralDecimals: this.props.item[6]
      })
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.item !== prevProps.item) {
      if (this.props.item.length === 7) {
        this.setState({
          collateral: this.props.item[0],
          lotSize: this.props.item[1],
          strikePrice: this.props.item[2],
          expiry: this.props.item[3],
          settlementPrice: this.props.item[4],
          reqCollateral: this.props.item[5],
          collateralDecimals: this.props.item[6]
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
              {this.state.collateral}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="left">
              {uintArray[1]}
            </TableCell>
            <TableCell align="right">
              {this.state.lotSize}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[2]}
          </TableCell>
            <TableCell align="right">
              {this.state.strikePrice}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[3]}
          </TableCell>
            <TableCell align="right">
              {this.state.expiry}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[4]}
          </TableCell>
            <TableCell align="right">
              {this.state.settlementPrice}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[5]}
          </TableCell>
            <TableCell align="right">
              {this.state.reqCollateral}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {uintArray[6]}
          </TableCell>
            <TableCell align="right">
              {this.state.collateralDecimals}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    )
  }
}

UintItems.contextTypes = {
  drizzle: PropTypes.object
}

export default drizzleConnect(UintItems)
