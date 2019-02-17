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
