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
