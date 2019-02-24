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

import web3 from 'web3'

import AddressItems from '../AddressItems'
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';


const BN = web3.utils.BN

let addressArray = [
  "Writer",
  "Holder",
  "Collateral Contract",
  "Premium Contract",
  "Oracle Resolver Now",
  "Oracle Resolver at Expiry",
]

let uintArray = [
  "Collateral Amount",
  "Lot Size",
  "Strike Price",
  "Expiry",
  "Requested Collateral"
]

let boolArray = [
  "RFP",
  "Style",
  "Direction"
]

class ListPiggyItem extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {
      Writer: '',
      Holder: '',
      Collateral: '',
      Premium: '',
      ResolverNow: '',
      ResolverAtExpiry: '',
      requestId: ''
    }
  }

  componentDidMount() {
    //this.setState({invalidAddress: false})
  }

  render() {
      //console.log(this.props.item)
      let addresses = addressArray.map((item, i) => <AddressItems key={i} item={item} index={i} />)
    return (
      <div>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell align="left">
                {/*{addressArray[this.props.index]}*/}
              </TableCell>
              <TableCell align="right">
                {/*{this.props.item.toString()}*/}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/*
          <li key={this.props.key}>
        <table>
          <tbody>
          <tr>
            <td>{titleArray[this.props.index]}</td>
            <td>{this.props.item.toString()}</td>
          </tr>
          </tbody>
          </table>
        </li>
        */}
      </div>
    )
  }
}

ListPiggyItem.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    SmartPiggies: state.contracts.SmartPiggies,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(ListPiggyItem, mapStateToProps)
