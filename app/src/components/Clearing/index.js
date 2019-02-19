import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'
import web3 from 'web3'


import Button from '@material-ui/core/Button'
import MenuItem from '@material-ui/core/MenuItem'
import TextField from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'


const BN = web3.utils.BN

const amounts = [
  {
    value: '1000000000000000000',
    label: '1x10^18',
  },
  {
    value: '10000000000000000000',
    label: '10x10^18',
  },
  {
    value: '100000000000000000000',
    label: '100x10^18',
  },
]

class Clearing extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

    this.handleInputChange = this.handleInputChange.bind(this)
    this.handleTextMenuChange = this.handleTextMenuChange.bind(this)
    this.handleTextInputChange = this.handleTextInputChange.bind(this)
    this.handleButton = this.handleButton.bind(this)

    this.state = {
      tokenId: '0',
      accountAddress: '0x0000000000000000000000000000000000000000',
      oracleFee: ''
    }
  }

  componentDidMount() {

    this.setState({
      accountAddress: this.props.accounts[0],
      tokenId: this.props.tokenId,
    })
  }

  handleTextInputChange(event) {
        this.setState({ [event.target.name]: event.target.value })
  }

  handleTextMenuChange = name => event => {
    this.setState({ [name]: event.target.value })
  }

  handleInputChange(event) {
    if (event.target.value.match(/^[0-9]{1,40}$/)) {
      var amount = new BN(event.target.value)
      if (amount.gte(0)) {
        this.setState({ [event.target.name]: amount.toString() })
        //this.setTXParamValue(amount)
      } else {
        this.setState({ [event.target.name]: '' })
        //this.setTXParamValue(0)
      }
    } else {
        this.setState({ [event.target.name]: '' })
        //this.setTXParamValue(0)
      }
  }

  setTXParamValue(_value) {
    if (web3.utils.isBN(_value)) {
      this.setState({
        detail: _value.toString()
      })
    } else {
      this.setState({
        detail: ''
      })
    }
  }

  handleButton() {
    this.contracts.SmartPiggies.methods.requestSettlementPrice(
      this.state.tokenId,
      this.state.oracleFee
    ).send({from: this.state.accountAddress, gas: 1000000, gasPrice: 1100000000})
    .then(result => {
      console.log(result)
    })
  }

  render() {

    return (
      <div className="App">
      <Paper>
        <Typography variant="h5" style={{marginBottom: "15px"}}>Clear a SmartPiggies Token</Typography>
        <Divider />
        <List>
            <ListItem>
                <ListItemText>Oracle Fee Units Denomination:</ListItemText>
                <TextField
                    id="denomination"
                    select
                    label="denomination"
                    value={this.state.oracleFee}
                    onChange={this.handleTextMenuChange('oracleFee')}
                    helperText="select a denomination"
                    margin="normal"
                    variant="filled"
                >
                    {amounts.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
            </ListItem>
            <ListItem>
                <ListItemText>Oracle Fee Amount:</ListItemText>
                <TextField
                  id="oracleFee"
                  label="oracleFee"
                  value={this.state.oracleFee}
                  onChange={this.handleTextMenuChange('oracleFee')}
                  margin="normal"
                  variant="filled"
                />
            </ListItem>
        </List>
        <Button type="Button" variant="contained" color="primary" style={{marginBottom: "15px"}} onClick={this.handleButton}>Clear</Button>
        </Paper>
      </div>
    )
  }
}

Clearing.contextTypes = {
  drizzle: PropTypes.object
}

// May still need this even with data function to refresh component on updates for this contract.
const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    StableToken: state.contracts.StableToken,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  }
}

export default drizzleConnect(Clearing, mapStateToProps)
