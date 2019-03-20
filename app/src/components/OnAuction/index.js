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
//import web3 from 'web3'

import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

class OnAuction extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.state = {
      piggyId: '0',
    }
  }

  componentDidMount() {
    this.setState({
      piggyId: this.props.tokenId,
    })
  }

  render() {

    return (
      <div className="App">
        <Paper>
          <Typography variant="h5" style={{ padding: "10px" }}>Auction Details for ID: {this.props.tokenId}</Typography>
          <Divider />
          <Table>
            <TableBody>

              <TableRow>
                <TableCell alight="left">
                  <Typography variant="h6">On auction: </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{this.props.piggyOnAuction ? 'Yes' : 'No'}</Typography>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell alight="left">
                  <Typography variant="h6">Start block: </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{this.props.startBlock}</Typography>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell alight="left">
                  <Typography variant="h6">Expiry block: </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{this.props.expiryBlock}</Typography>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell alight="left">
                  <Typography variant="h6">Start Price: </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{this.props.startPrice}</Typography>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell alight="left">
                  <Typography variant="h6">Reserve Price: </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{this.props.reservePrice}</Typography>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell alight="left">
                  <Typography variant="h6">Time Step: </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{this.props.timeStep}</Typography>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell alight="left">
                  <Typography variant="h6">Price Step: </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6">{this.props.priceStep}</Typography>
                </TableCell>
              </TableRow>

            </TableBody>
          </Table>
        </Paper>
      </div>
    )
  }
}

OnAuction.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    SmartPiggies: state.contracts.SmartPiggies,
    StableToken: state.contracts.StableToken,
    TestnetLINK: state.contracts.TestnetLINK,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(OnAuction, mapStateToProps)
