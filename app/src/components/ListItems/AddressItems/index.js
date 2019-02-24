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

let addressArray = [
  "Writer",
  "Holder",
  "Collateral Contract",
  "Premium Contract",
  "Oracle Resolver Now",
  "Oracle Resolver at Expiry",
]

class AddressItem extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {
      writer: '',
      holder: '',
      collateral: '',
      premium: '',
      resolverNow: '',
      resolverAtExpiry: ''
    }
  }

  componentDidMount() {
    if (this.props.item.length === 6) {
      this.setState({
        writer: this.props.item[0],
        holder: this.props.item[1],
        collateral: this.props.item[2],
        premium: this.props.item[3],
        resolverNow: this.props.item[4],
        resolverAtExpiry: this.props.item[5]
      })
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.item !== prevProps.item) {
      if (this.props.item.length === 6) {
        this.setState({
          writer: this.props.item[0],
          holder: this.props.item[1],
          collateral: this.props.item[2],
          premium: this.props.item[3],
          resolverNow: this.props.item[4],
          resolverAtExpiry: this.props.item[5]
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
              {addressArray[0]}
            </TableCell>
            <TableCell align="right">
              {this.state.writer}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell align="left">
              {addressArray[1]}
            </TableCell>
            <TableCell align="right">
              {this.state.holder}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {addressArray[2]}
          </TableCell>
            <TableCell align="right">
              {this.state.collateral}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {addressArray[3]}
          </TableCell>
            <TableCell align="right">
              {this.state.premium}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {addressArray[4]}
          </TableCell>
            <TableCell align="right">
              {this.state.resolverNow}
            </TableCell>
          </TableRow>
          <TableRow>
          <TableCell align="left">
            {addressArray[5]}
          </TableCell>
            <TableCell align="right">
              {this.state.resolverAtExpiry}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    )
  }
}

AddressItem.contextTypes = {
  drizzle: PropTypes.object
}

export default drizzleConnect(AddressItem)
