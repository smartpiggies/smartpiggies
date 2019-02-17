import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

//import web3 from 'web3'

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

//const BN = web3.utils.BN

class ListItem extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {

    }
  }

  componentDidMount() {
    //this.setState({invalidAddress: false})
  }

  render() {
    return (
      <div>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell align="left">
              #{this.props.index}
            </TableCell>
            <TableCell align="right">
              {this.props.item.toString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    )
  }
}

ListItem.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    StructTest: state.contracts.StructTest,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(ListItem, mapStateToProps)
