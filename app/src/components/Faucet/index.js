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


import Button from '@material-ui/core/Button'

import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'

class Faucet extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleButton = this.handleButton.bind(this)

    this.state = {
    }
  }

  componentDidMount() {
    this.setState({
    })
  }

  handleButton() {
    this.contracts.StableTokenFaucet.methods.drip.cacheSend(
      {from: this.props.accounts[0], gas: 1000000, gasPrice: 1100000000})
  }

  render() {

    return (
      <div className="App">
        <Paper>
            <Typography variant="h5" style={{padding: "10px"}}>Get some Stable Tokens (STBLE-F)</Typography>
            <Divider />
            <p>There is a rate limit of 100 STABLE-F tokens per five minutes.</p>
            <br></br>
            <Button type="Button" variant="contained" color="primary" size="large" onClick={this.handleButton} style={{marginBottom: "15px"}}>Mint</Button>
        </Paper>
      </div>
    )
  }
}

Faucet.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    StableTokenFacuet: state.contracts.StableTokenFacuet,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(Faucet, mapStateToProps)
