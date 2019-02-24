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
import React, { Component } from 'react';
import { drizzleConnect } from 'drizzle-react';
import PropTypes from 'prop-types'
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

class ERC20Stats extends Component {
    constructor(props, context) {
      super(props)
      this.contracts = context.drizzle.contracts
      this.drizzle = context.drizzle

      this.handleERC20Select = this.handleERC20Select.bind(this)

      // state for handling ERC-20 contract info
      this.state = {
        accountAddress: '0x0000000000000000000000000000000000000000',
        currentERC20: 'None',
        ERC20Keys: ['Dai', 'Gemini Dollar', 'USD Coin'],
        // alternatively, could use this to pre-fetch all data that would be necessary to populate the list below (slower startup, faster response after)
        ERC20s: {
            // default
            'None': {
                address: 'None',
                userBalance: 'None',
                approvedToSP: 'None',
                availablePayout: 'None',
            },
            'Dai': {
                //name: 'Dai',
                address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
                userBalance: 'Dai user balance goes here',
                approvedToSP: 'Dai amount approved to SP goes here',
                availablePayout: 'Dai amount available for payout goes here',
            },
            'Gemini Dollar': {
                //name: 'Gemini Dollar',
                address: '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd',
                userBalance: 'GD user balance goes here',
                approvedToSP: 'GD amount approved to SP goes here',
                availablePayout: 'GS amount available for payout goes here',
            },
            'USD Coin': {
                //name: 'USD Coin',
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                userBalance: 'USDC user balance goes here',
                approvedToSP: 'USDC amount approved to SP goes here',
                availablePayout: 'USDC amount available for payout goes here',
            },
        }
      }
    }

    componentWillMount() {
        this.setState({
            accountAddress: this.props.accounts[0]
        })
    }

    componentDidMount() {
        // update the list of keys
        let ERC20Array = this.state.ERC20Keys
        ERC20Array.push('STBLE', 'Link')
        // request a bunch of values to get set in the Drizzle Redux store, cache keys to state
        const dataKeyUB_STBLE = this.contracts.StableToken.methods['balanceOf'].cacheCall(this.state.accountAddress)
        const dataKeyATSP_STBLE = this.contracts.StableToken.methods['allowance'].cacheCall(this.state.accountAddress, this.contracts.SmartPiggies.address)
        const dataKeyAP_STBLE = this.contracts.SmartPiggies.methods['getERC20balance'].cacheCall(this.state.accountAddress, this.contracts.StableToken.address)
        const dataKeyUB_Link = this.contracts.RopstenLINK.methods['balanceOf'].cacheCall(this.state.accountAddress)
        const dataKeyATSP_Link = this.contracts.RopstenLINK.methods['allowance'].cacheCall(this.state.accountAddress, this.contracts.SmartPiggies.address)
        const dataKeyAP_Link = this.contracts.SmartPiggies.methods['getERC20balance'].cacheCall(this.state.accountAddress, this.contracts.RopstenLINK.address)
        this.setState({
            dataKeyUB_STBLE: dataKeyUB_STBLE,
            dataKeyATSP_STBLE: dataKeyATSP_STBLE,
            dataKeyAP_STBLE: dataKeyAP_STBLE,
            dataKeyUB_Link: dataKeyUB_Link,
            dataKeyATSP_Link: dataKeyATSP_Link,
            dataKeyAP_Link: dataKeyAP_Link,
        })
        // update the object mapping keys to ERC-20 contract values
        let ERC20Mapping = this.state.ERC20s
        ERC20Mapping['STBLE'] = {
            address: this.contracts.StableToken.address,
            userBalance: "None",
            approvedToSP: "None",
            availablePayout: "None",
        }
        ERC20Mapping['Link'] = {
            address: this.contracts.RopstenLINK.address,
            userBalance: "None",
            approvedToSP: "None",
            availablePayout: "None",
        }
        this.setState({
          accountAddress: this.props.accounts[0],
          ERC20Keys: ERC20Array,
          ERC20s: ERC20Mapping
        })
      }

    handleERC20Select = event => {
      let statusCopy = Object.assign({}, this.state);
      statusCopy.currentERC20 = event.target.value;

      if (this.props.StableToken.balanceOf[this.state.dataKeyUB_STBLE] !== undefined) {
          statusCopy.ERC20s['STBLE']['userBalance'] = this.props.StableToken.balanceOf[this.state.dataKeyUB_STBLE].value;
      }
      if (this.props.StableToken.allowance[this.state.dataKeyATSP_STBLE] !== undefined) {
          statusCopy.ERC20s['STBLE']['approvedToSP'] = this.props.StableToken.allowance[this.state.dataKeyATSP_STBLE].value;
      }
      if(this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_STBLE] !== undefined) {
          statusCopy.ERC20s['STBLE']['availablePayout'] = this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_STBLE].value;
      }
      if (this.props.RopstenLINK.balanceOf[this.state.dataKeyUB_Link] !== undefined) {
          statusCopy.ERC20s['Link']['userBalance'] = this.props.RopstenLINK.balanceOf[this.state.dataKeyUB_Link].value;
      }
      if (this.props.RopstenLINK.allowance[this.state.dataKeyATSP_Link] !== undefined) {
          statusCopy.ERC20s['Link']['approvedToSP'] = this.props.RopstenLINK.allowance[this.state.dataKeyATSP_Link].value;
      }
      if(this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_Link] !== undefined) {
          statusCopy.ERC20s['Link']['availablePayout'] = this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_Link].value;
      }
      this.setState(statusCopy);
    };

    /* delete
    // use Drizzle's Redux store to manage state fetched from on-chain contracts
    setCachedValues(event) {
        let statusCopy = Object.assign({}, this.state);
        statusCopy.currentERC20 = event.target.value;

        if (this.props.StableToken.balanceOf[this.state.dataKeyUB_STBLE] !== undefined) {
            statusCopy.ERC20s['STBLE']['userBalance'] = this.props.StableToken.balanceOf[this.state.dataKeyUB_STBLE].value;
        }
        if (this.props.StableToken.allowance[this.state.dataKeyATSP_STBLE] !== undefined) {
            statusCopy.ERC20s['STBLE']['approvedToSP'] = this.props.StableToken.allowance[this.state.dataKeyATSP_STBLE].value;
        }
        if(this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_STBLE] !== undefined) {
            statusCopy.ERC20s['STBLE']['availablePayout'] = this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_STBLE].value;
        }
        if (this.props.RopstenLINK.balanceOf[this.state.dataKeyUB_Link] !== undefined) {
            statusCopy.ERC20s['Link']['userBalance'] = this.props.RopstenLINK.balanceOf[this.state.dataKeyUB_Link].value;
        }
        if (this.props.RopstenLINK.allowance[this.state.dataKeyATSP_Link] !== undefined) {
            statusCopy.ERC20s['Link']['approvedToSP'] = this.props.RopstenLINK.allowance[this.state.dataKeyATSP_Link].value;
        }
        if(this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_Link] !== undefined) {
            statusCopy.ERC20s['Link']['availablePayout'] = this.props.SmartPiggies.getERC20balance[this.state.dataKeyAP_Link].value;
        }
        this.setState(statusCopy);
    }
    */

    render() {

        return(
            <div>
                <Paper>
                <List>
                    <ListItem>
                        <Typography variant="h5" component="h3">
                            ERC-20 Contract Information
                        </Typography>
                    </ListItem>
                    <Divider />
                    <ListItem>
                        <form>
                            <FormControl>
                                <InputLabel shrink>ERC-20</InputLabel>
                                <Select
                                    value={this.state.currentERC20}
                                    onChange={this.handleERC20Select}
                                    name="currentERC20"
                                >
                                    <MenuItem value="None">
                                    <em>None</em>
                                    </MenuItem>

                                    {this.state.ERC20Keys.map(option => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </form>
                    </ListItem>
                    <Divider light />
                    <ListItem>
                        <ListItemText primary="Balance:" secondary={this.state.ERC20s[this.state.currentERC20]['userBalance']} />
                    </ListItem>
                    <Divider light />
                    <ListItem>
                        <ListItemText primary="Amount Approved for SmartPiggies Use:" secondary={this.state.ERC20s[this.state.currentERC20]['approvedToSP']} />
                    </ListItem>
                    <Divider light />
                    <ListItem>
                    <ListItemText primary="Amount Available as Payout from SmartPiggies:" secondary={this.state.ERC20s[this.state.currentERC20]['availablePayout']} />
                    </ListItem>
                </List>
                </Paper>
            </div>
        )
    }
}

ERC20Stats.contextTypes = {
    drizzle: PropTypes.object
}

const mapStateToProps = state => {
    return {
        accounts: state.accounts,
        SmartPiggies: state.contracts.SmartPiggies,
        StableToken: state.contracts.StableToken,
        RopstenLINK: state.contracts.RopstenLINK,
        drizzleStatus: state.drizzleStatus,
    }
}

export default drizzleConnect(ERC20Stats, mapStateToProps)
