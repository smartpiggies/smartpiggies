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

class ListPiggyItem extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {
      counter: 0
    }
  }

  componentDidMount() {
    if (this.props.index === 0) {
      console.log(this.props.item)
      //addresses = <AddressItems item={this.props.item} />
    }
    if (this.props.index === 1) {
      console.log("1")
    }
    if (this.props.index === 2) {
      console.log("2")
    }
    if (this.props.index === 3) {
      console.log("3")
    }
    //addresses = <AddressItems item={this.props.item} />
  }

  render() {

    return (
      <div>
      {/*{addresses}*/}
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
