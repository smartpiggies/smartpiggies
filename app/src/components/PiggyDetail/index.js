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
      piggyID: 0
    }
  }

  componentDidMount() {
    //this.setState({invalidAddress: false})
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
      <table>
        <tbody>
          <tr>
            <td>
              <TextField
                id="piggyID"
                label="piggyID"
                value={this.state.piggyID}
                onChange={this.handleTextInputChange('piggyID')}
                margin="normal"
                variant="filled"
              />
              </td>
              <td>
                <Button type="Button" variant="contained" onClick={this.handleButton}>Get Info</Button>
              </td>
            </tr>
          </tbody>
        </table>
        {/*{items}*/}
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
