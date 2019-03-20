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
import Typography from '@material-ui/core/Typography'

let blockNumber, expiryBlock, startPrice, startBlock, priceStep, timeStep, delta

class AuctionPrice extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts
    this.BN = context.drizzle.web3.utils.BN

    this.state = {
      auctionPrice: 0,
    }
  }

  componentDidMount() {
    if (this.props.auctionDetails.length !== undefined && this.props.auctionDetails[6]) {
      expiryBlock = new this.BN(this.props.auctionDetails.expiryBlock)
      blockNumber = new this.BN(this.props.blockNumber)
      if (blockNumber.lt(expiryBlock)) {
        startPrice = new this.BN(this.props.auctionDetails[2])
        startBlock = new this.BN(this.props.auctionDetails[0])
        priceStep = new this.BN(this.props.auctionDetails[5])
        timeStep = new this.BN(this.props.auctionDetails[4])

        delta = new this.BN((blockNumber).sub(startBlock).mul(priceStep).div(timeStep))
        this.setState({
          auctionPrice: startPrice.sub(delta).toString(),
        })
      } else {
        this.setState({
          auctionPrice: this.props.auctionDetails.reservePrice,
        })
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.auctionDetails !== prevProps.auctionDetails) {
      if (this.props.auctionDetails.length !== undefined && this.props.auctionDetails[6]) {
        expiryBlock = new this.BN(this.props.auctionDetails.expiryBlock)
        blockNumber = new this.BN(this.props.blockNumber)
        if (blockNumber.lt(expiryBlock)) {
          startPrice = new this.BN(this.props.auctionDetails[2])
          startBlock = new this.BN(this.props.auctionDetails[0])
          priceStep = new this.BN(this.props.auctionDetails[5])
          timeStep = new this.BN(this.props.auctionDetails[4])

          delta = new this.BN((blockNumber).sub(startBlock).mul(priceStep).div(timeStep))
          this.setState({
            auctionPrice: startPrice.sub(delta).toString(),
          })
        } else {
          this.setState({
            auctionPrice: this.props.auctionDetails.reservePrice,
          })
        }
      }
    }

    if (this.props.blockNumber !== prevProps.blockNumber) {
      if (this.props.auctionDetails.length !== undefined && this.props.auctionDetails[6]) {
        expiryBlock = new this.BN(this.props.auctionDetails.expiryBlock)
        blockNumber = new this.BN(this.props.blockNumber)
        if (blockNumber.lt(expiryBlock)) {
          startPrice = new this.BN(this.props.auctionDetails[2])
          startBlock = new this.BN(this.props.auctionDetails[0])
          priceStep = new this.BN(this.props.auctionDetails[5])
          timeStep = new this.BN(this.props.auctionDetails[4])

          delta = new this.BN((blockNumber).sub(startBlock).mul(priceStep).div(timeStep))
          this.setState({
            auctionPrice: startPrice.sub(delta).toString(),
          })
        } else {
          this.setState({
            auctionPrice: this.props.auctionDetails.reservePrice,
          })
        }
      }
    }
  }

  render() {

    return (
      <div>
        <Typography variant="h6" style={{padding: "10px"}}>Auction Price: {this.state.auctionPrice}</Typography>
      </div>
    )
  }
}

AuctionPrice.contextTypes = {
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

export default drizzleConnect(AuctionPrice, mapStateToProps)
