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

import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import AddressItems from "../ListItems/AddressItems"
import UintItems from "../ListItems/UintItems"
import BoolItems from "../ListItems/BoolItems"
import AuctionItems from "../ListItems/AuctionItems"

let addressValues, uintValues, boolValues, auctionValues

class BrowsePiggy extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts
    this.state = {
      showAuction: false,
    }
  }

  componentDidMount() {
    if (this.props.details.length !== undefined && this.props.details.length > 0) {
      addressValues = <AddressItems item={this.props.details[0]} />
      uintValues = <UintItems item={this.props.details[1]} />
      boolValues = <BoolItems item={this.props.details[2]} />
    }

    if (this.props.auctionDetails.length !== undefined && this.props.auctionDetails.length > 0) {
      if (this.props.auctionDetails.auctionActive) {
        auctionValues = <AuctionItems item={this.props.auctionDetails} />
        this.setState({
          showAuction: true,
        })
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.details !== prevProps.details) {
      if (this.props.details.length !== undefined && this.props.details.length > 0) {
        addressValues = <AddressItems item={this.props.details[0]} />
        uintValues = <UintItems item={this.props.details[1]} />
        boolValues = <BoolItems item={this.props.details[2]} />
      }
    }

    if (this.props.auctionDetails !== prevProps.auctionDetails) {
      if (this.props.auctionDetails.length !== undefined && this.props.auctionDetails.length > 0) {
        if (this.props.auctionDetails.auctionActive) {
          auctionValues = <AuctionItems item={this.props.auctionDetails} />
          this.setState({
            showAuction: true,
          })
        } else {
          this.setState({
            showAuction: false,
          })
        }
      }
    }
  }

  render() {

    return (
      <div>
      <Paper>
        {addressValues}
        {uintValues}
        {boolValues}
        {this.state.showAuction &&
          <div>
          <Typography variant="h6" style={{padding: "10px", marginTop: "15px"}}>On Auction</Typography>
          <Divider />
          {auctionValues}
          </div>
        }
        </Paper>
      </div>
    )
  }
}

BrowsePiggy.contextTypes = {
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

export default drizzleConnect(BrowsePiggy, mapStateToProps)
