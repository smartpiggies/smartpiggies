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
import AddressItems from "../ListItems/AddressItems"
import UintItems from "../ListItems/UintItems"
import BoolItems from "../ListItems/BoolItems"

let addressValues, uintValues, boolValues

class PiggyDetail extends Component {
  constructor(props, context) {
    super(props)

    //this.structArray = this.props.structs

    this.contracts = context.drizzle.contracts

    this.state = {
      detailDataKey: ''
    }
  }

  componentDidMount() {
    if (this.props.piggies !== undefined) {
      let result
      if (this.props.piggies.length > 0) {
        result = this.props.piggies.filter(items => items.label === this.props.piggyId)
        if (result.length > 0) {
          if (this.props.SmartPiggies.getDetails[result[0].value] !== undefined) {
            let detailArray = this.props.SmartPiggies.getDetails[result[0].value].value
            addressValues = <AddressItems item={detailArray[0]} />
            uintValues = <UintItems item={detailArray[1]} />
            boolValues = <BoolItems item={detailArray[2]} />
          }

          this.setState({
            detailDataKey: result[0].value
          })
        }

      }
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.piggies !== undefined) {
      //changed from if(this.props.piggies != ...)
      if (this.props.piggyId !== prevProps.piggyId) {
        let result
        if (this.props.piggies.length > 0) {
          result = this.props.piggies.filter(items => items.label === this.props.piggyId)
          if (result.length > 0) {
            if (this.props.SmartPiggies.getDetails[result[0].value] !== undefined) {
              let detailArray = this.props.SmartPiggies.getDetails[result[0].value].value

              addressValues = <AddressItems item={detailArray[0]} />
              uintValues = <UintItems item={detailArray[1]} />
              boolValues = <BoolItems item={detailArray[2]} />
            }
            this.setState({
              detailDataKey: result[0].value
            })
          }
        }
      }
    }

    //update if piggy has been cleared
    if (this.props.piggies !== prevProps.piggies) {

      if (this.props.SmartPiggies.getDetails[this.state.detailDataKey] !== undefined) {

        if (this.props.SmartPiggies.getDetails[this.state.detailDataKey].value.flags.hasBeenCleared !==
              prevProps.SmartPiggies.getDetails[this.state.detailDataKey].value.flags.hasBeenCleared) {
          //never makes it here as there is not distiction between this and prev for hasBeenCleared
          let detailArray = this.props.SmartPiggies.getDetails[this.state.detailDataKey].value
          addressValues = <AddressItems item={detailArray[0]} />
          uintValues = <UintItems item={detailArray[1]} />
          boolValues = <BoolItems item={detailArray[2]} />
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
        </Paper>
      </div>
    )
  }
}

PiggyDetail.contextTypes = {
  drizzle: PropTypes.object
}

PiggyDetail.propTypes = {
  piggies: PropTypes.array.isRequired,
  piggyId: PropTypes.string.isRequired
};

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

export default drizzleConnect(PiggyDetail, mapStateToProps)
