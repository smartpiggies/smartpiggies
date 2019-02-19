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
      if (this.props.piggies !== prevProps.piggies) {
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
  }

  render() {
    //console.log(this.state.piggyID)
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
