import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
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
    this.handleTextInputChange = this.handleTextInputChange.bind(this)
    this.handleButton = this.handleButton.bind(this)
    this.state = {
      piggyId: 0,
      detailDataKey: ''
    }
  }

  componentDidMount() {
    let result
    if (this.props.piggies.length > 0) {
      result = this.props.piggies.filter(items => items.label === this.props.piggyId)
      if (result.length > 0) {
        let detailArray = this.props.SmartPiggies.getDetails[result[0].value].value

        addressValues = <AddressItems item={detailArray[0]} />
        uintValues = <UintItems item={detailArray[1]} />
        boolValues = <BoolItems item={detailArray[2]} />

        this.setState({
          detailDataKey: result[0].value
        })
      }

    }

    this.setState({
      piggyId: this.props.piggyId
    })
  }

  componentDidUpdate(prevProps) {
    if (this.props.piggyId !== prevProps.piggyId) {
      let result
      if (this.props.piggies.length > 0) {
        result = this.props.piggies.filter(items => items.label === this.props.piggyId)
        if (result.length > 0) {
          let detailArray = this.props.SmartPiggies.getDetails[result[0].value].value

          addressValues = <AddressItems item={detailArray[0]} />
          uintValues = <UintItems item={detailArray[1]} />
          boolValues = <BoolItems item={detailArray[2]} />

          this.setState({
            detailDataKey: result[0].value
          })
        }

      }

      this.setState({
        piggyId: this.props.piggyId
      })
    }
  }

  handleTextInputChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  handleButton() {
    this.contracts.SmartPiggies.methods.getDetails(
      this.state.piggyID,
    ).call({from: this.props.accounts[0]})
    .then(result => {
      if (result.length === 3) {
        addressValues = <AddressItems item={result[0]} />
        uintValues = <UintItems item={result[1]} />
        boolValues = <BoolItems item={result[2]} />
      }
    })
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
