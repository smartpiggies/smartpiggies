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
import React, { Component } from "react"
import { drizzleConnect } from "drizzle-react"

import PropTypes from 'prop-types'

/* import components */
import AppBar from '@material-ui/core/AppBar'
import Grid from '@material-ui/core/Grid'
import Paper from '@material-ui/core/Paper'

import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Button from '@material-ui/core/Button';
//import Icon from '@material-ui/core/Icon';

import logo from '../../Assets/Logo/logo.png'
import ERC20Stats from '../ERC20Stats';
import PiggyDetail from '../PiggyDetail'
import SatisfyAuction from "../SatisfyAuction";
import CreatePiggy from '../CreatePiggy';
import StartAuction from '../StartAuction'
import OnAuction from '../OnAuction'
import Clearing from '../Clearing';
import Settlement from '../Settlement';
import Claim from '../Claim';
import Approvals from '../Approvals';
import Faucet from '../Faucet';
import TXModal from '../TXModal'

const appBar = {
  backgroundColor: 'default',
  //height: 50,
  display: 'block',
  padding: 10,
};

const leftPane = {
  backgroundColor: '#FFCBCB',
  //height: 500,
  width: 300,
  margin: "1em",
  textAlign: 'left',
  display: 'block',
  padding: 10,
  marginTop: '5em'
};

const main = {
  backgroundColor: '#FFCBCB',
  //height: '60em', // COMMENT THIS OUT LATER WHEN THERE IS CONTENT TO PUT IN
  width: '50em',
  margin: '1em',
  textAlign: 'center',
  display: 'block',
  padding: 10,
  marginTop: '5em'
};

const grid = {
  flexGrow: 1,
  paper: {
    height: 140,
    width: 100,
  },
  control: {
    padding: 20,
  }
}

let globalDataKeyGetOwnedPiggies, activeNetwork

class Home extends Component {
  constructor(props, context) {
    super(props)
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    //this.handleDrawerOpen = this.handleDrawerOpen.bind(this)
    this.handleSelectPiggy = this.handleSelectPiggy.bind(this)
    this.groomAddress = this.groomAddress.bind(this)

    this.state = {
      spContractAddress: '',
      activeAccount: '',
      open: true,
      selectedPiggy: '',
      ownedPiggies: [],
      piggyDetailMap: [],
      piggyAuctionMap: [],
      blockNumber: 0,
      network: 0,

      //datakeys
      dataKeyGetOwnedPiggies: '',
      dataKeyGetDetails: '',
      dataKeyGetActionDetails: '',

      // visibility state management
      // easiest way to handle these is if you have event handlers for clicks that set all to false except the ones that should be true
      piggyOnAuction: false, // PLACEHOLDER FOR TESTING - FETCH LATER
      piggyHasBeenCleared: true,  // PLACEHOLDER FOR TESTING - FETCH LATER
      showDefaultPage: true,  // should be true on initial load, and if we ever get redirected back here after a special action
      showPiggyDetails: false, // PLACEHOLDER FOR TESTING - DEFAULT SHOULD PROBABLY BE FALSE
      showCreatePiggy: false,
      showSearchAndBuy: false,
      showClaimPayout: false,
      showApprovals: false,
      showFaucet: false,
      //showAuctionDetails: false, // PLACEHOLDER FOR TESTING - DEFAULT SHOULD PROBABLY BE FALSE
      //showAdminArea: false,  // PLACEHOLDER FOR TESTING - DEFAULT SHOULD PROBABLY BE FALSE

      //Auction details state
      startBlock: '',
      expiryBlock: '',
      startPrice: '',
      reservePrice: '',
      timeStep: '',
      priceStep: '',
    }
  }

  componentDidMount() {
    // If Drizzle is initialized (and therefore web3, accounts and contracts), continue.
    if (this.props.drizzleStatus.initialized) {
      // Declare this call to be cached and synchronized. We'll receive the store key for recall.
      globalDataKeyGetOwnedPiggies = this.contracts.SmartPiggies.methods['getOwnedPiggies'].cacheCall(this.props.accounts[0])

      //updating from getDetails slams the lifecycle update and crashes the app
      //there must be something changing state every time it polls the contract
      //globalDataKeyGetDetails = this.contracts.SmartPiggies.methods['getDetails'].cacheCall()


      this.setState({
        dataKeyGetOwnedPiggies: globalDataKeyGetOwnedPiggies,
        //dataKeyGetDetails: globalDataKeyGetDetails,
        network: this.drizzle.web3.givenProvider.networkVersion
      })

      switch (this.state.network) {
        case '1':
          activeNetwork = 'Ethereum'
          break
        case '3':
          activeNetwork = 'Ropsten'
          break
        case '4':
          activeNetwork = 'Rinkeby'
          break
        case '5':
          activeNetwork = 'Goerli'
          break
        default:
          activeNetwork = 'unknown'
      }

      //set block number on load
      this.drizzle.web3.eth.getBlockNumber()
      .then(result => {
        this.setState({
          blockNumber: result
        })
      })
    }

    this.setState({
      spContractAddress: this.contracts.SmartPiggies.address,
      activeAccount: this.props.accounts[0]
    })

    //update current block number every 10 seconds
    this.interval = setInterval(() => {
      this.drizzle.web3.eth.getBlockNumber()
      .then(result => {
        this.setState({
          blockNumber: result
        })
      })
    }, 10000)
  }

  componentDidUpdate(prevProps, prevState) {
    //Update if there is a change in owned piggies
    if (this.props.SmartPiggies.getOwnedPiggies !== prevProps.SmartPiggies.getOwnedPiggies) {
      //console.log(this.props.SmartPiggies.getOwnedPiggies)
      let piggyIds = []
      let piggyDataKeys = []
      let piggyAuctionDataKeys = []
      if(this.props.SmartPiggies.getOwnedPiggies[this.state.dataKeyGetOwnedPiggies] !== undefined) {
        piggyIds = this.props.SmartPiggies.getOwnedPiggies[this.state.dataKeyGetOwnedPiggies].value
        this.setState({
          ownedPiggies: this.props.SmartPiggies.getOwnedPiggies[this.state.dataKeyGetOwnedPiggies].value
        })
        for (let i = 0; i < piggyIds.length; i++) {
          //create data keys return array
          piggyDataKeys.push(
            {
              value: this.contracts.SmartPiggies.methods['getDetails'].cacheCall(piggyIds[i]),
              label: piggyIds[i]
            }
          )
          //create Auction details data keys return array
          piggyAuctionDataKeys.push(
            {
              value: this.contracts.SmartPiggies.methods['getAuctionDetails'].cacheCall(piggyIds[i]),
              label: piggyIds[i]
            }
          )
        }

        //set state
        this.setState({
          piggyDetailMap: piggyDataKeys,
          piggyAuctionMap: piggyAuctionDataKeys
        })
      }
    }
    // end update getDetails

    //Update network
    if (this.state.network !== prevState.network) {
      switch (this.state.network) {
        case '1':
          activeNetwork = 'Ethereum'
          break
        case '3':
          activeNetwork = 'Ropsten'
          break
        case '4':
          activeNetwork = 'Rinkeby'
          break
        case '5':
          activeNetwork = 'Goerli'
          break
        default:
          activeNetwork = 'unknown'
      }
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval)
  }

  groomAddress(address) {
    let groomed
    if (address !== '0x0000000000000000000000000000000000000000') {
      groomed = address.slice(0, 6)
      groomed = groomed + "...." + address.slice(-4)
    }
    return groomed
  }

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleSelectPiggy = value => () => {
    let auctionArray = []
    let clearedArray = []
    let auctionActive = false
    let clearedActive = false
    let result = this.state.piggyAuctionMap.filter(items => items.label === value)
    if (result.length > 0) {
      if (this.props.SmartPiggies.getAuctionDetails[result[0].value] !== undefined) {
        auctionArray = this.props.SmartPiggies.getAuctionDetails[result[0].value].value
      }
      if (auctionArray.length > 5) {
        auctionActive = auctionArray[6]
      }
    }
    if (auctionActive) {

      this.setState({
        startBlock: auctionArray[0],
        expiryBlock: auctionArray[1],
        startPrice: auctionArray[2],
        reservePrice: auctionArray[3],
        timeStep: auctionArray[4],
        priceStep: auctionArray[5],
      })
    }
    let cleared = this.state.piggyDetailMap.filter(items => items.label === value)
    if (cleared.length > 0) {
      if (this.props.SmartPiggies.getDetails[cleared[0].value] !== undefined) {
        clearedArray = this.props.SmartPiggies.getDetails[cleared[0].value].value
      }
      if (clearedArray.length === 3) {
        clearedActive = clearedArray[2][3]
      }
    }

    this.setState({
      selectedPiggy: value,
      showPiggyDetails: true,
      showDefaultPage: false,
      piggyOnAuction: auctionActive,
      showSearchAndBuy: false,
      showClaimPayout: false,
      showApprovals: false,
      showFaucet: false,
      piggyHasBeenCleared: clearedActive
    })
    window.scrollTo(0,0);
  }

  handleCreatePiggy = () => {
    this.setState({
      showDefaultPage: false,
      showPiggyDetails: false,
      showCreatePiggy: true,
      showSearchAndBuy: false,
      showClaimPayout: false,
      showApprovals: false,
      showFaucet: false,
    })
    window.scrollTo(0,0);
  }

  handleSearchAndBuy = () => {
    this.setState({
      showDefaultPage: false,
      showPiggyDetails: false,
      showCreatePiggy: false,
      showSearchAndBuy: true,
      showClaimPayout: false,
      showApprovals: false,
      showFaucet: false,
    })
    window.scrollTo(0,0);
  }

  handleClaimPayouts = () => {
    this.setState({
      showDefaultPage: false,
      showPiggyDetails: false,
      showCreatePiggy: false,
      showSearchAndBuy: false,
      showClaimPayout: true,
      showApprovals: false,
      showFaucet: false,
    })
    window.scrollTo(0,0);
  }

  handleApprovals = () => {
    this.setState({
      showDefaultPage: false,
      showPiggyDetails: false,
      showCreatePiggy: false,
      showSearchAndBuy: false,
      showClaimPayout: false,
      showApprovals: true,
      showFaucet: false,
    })
    window.scrollTo(0,0);
  }

  handleFaucet = () => {
    this.setState({
      showDefaultPage: false,
      showPiggyDetails: false,
      showCreatePiggy: false,
      showSearchAndBuy: false,
      showClaimPayout: false,
      showApprovals: false,
      showFaucet: true,
    })
    window.scrollTo(0,0);
  }

  handleHome = () => {
    this.setState({
      showDefaultPage: true,
      showPiggyDetails: false,
      showCreatePiggy: false,
      showSearchAndBuy: false,
      showClaimPayout: false,
      showApprovals: false,
      showFaucet: false,
    })
    window.scrollTo(0,0);
  }

  render() {
    //console.log(this.state.piggyDetailMap)
    //console.log(this.props.SmartPiggies.getDetails)
    //console.log(this.state.selectedPiggy)
    let groomedAddress = this.groomAddress(this.state.activeAccount)
    let piggies
    if (this.state.ownedPiggies.length > 0) {
      piggies = this.state.ownedPiggies.map((item, i) =>
        <ListItem button key={i} value={item} onClick={this.handleSelectPiggy(item)}>
          <ListItemText>
            tokenId:
          </ListItemText>
          {item}
        </ListItem>)
    }
    return (
      <div>
        <AppBar
          style={appBar}
          color="default"
        >
          <table width="100%">
            <tbody>
              <tr>
                <td>Contract: {this.state.spContractAddress}</td>
                <td text-align="right">Block: {this.state.blockNumber}</td>
              </tr>
              <tr>
                <td>User: {groomedAddress}</td>
                <td text-align="right">Network: {activeNetwork}</td>
              </tr>
            </tbody>
          </table>
        </AppBar>

        <Grid container style={grid}>
          <Grid item>
            <Grid container>
              <Paper style={leftPane}>

                {/**  Account + piggy information */}
                <List>
                  <ListItem>
                    <ListItemText primary="Piggies:" primaryTypographyProps={{variant: "h6"}} />
                    <Button variant="contained" color="primary" onClick={this.handleCreatePiggy}>Create New</Button>
                  </ListItem>
                </List>
                <List style={{maxHeight: 450, overflow: 'auto'}}>


                  {piggies}

                </List>
                {/**  ERC-20 information */}
                <br></br>
                <ERC20Stats />

              </Paper>
            </Grid>
          </Grid>
          <Divider light />
          <Grid item>
            <Grid container>
              <Paper style={main}>
                {/** Persistent Action Bar "component" - should show UNLESS all "component state management" bools are false */}

                  <div>
                    <Paper style={{marginBottom: "10px"}}>
                      <Button variant="contained" onClick={this.handleHome} style={{marginRight: "10px"}}>Home</Button>
                      <Button variant="contained" onClick={this.handleSearchAndBuy} style={{marginRight: "10px", marginTop: "15px", marginBottom: "15px"}}>Search and Buy Piggies</Button>
                      <Button variant="contained" onClick={this.handleClaimPayouts} style={{marginRight: "10px"}}>Claim Payouts</Button>
                      <Button variant="contained" onClick={this.handleApprovals} style={{marginRight: "10px"}}>Approvals</Button>
                      <Button variant="contained" onClick={this.handleFaucet} style={{marginRight: "10px"}}>Faucet</Button>
                    </Paper>
                  </div>

                {/** Default Screen "component" - should show if all "component state management" bools are false*/}

                {this.state.showDefaultPage &&

                  <div>
                    <img src={logo} alt="drizzle-logo" />
                    <br></br>
                    <Typography variant="h4">
                      Welcome to SmartPiggies!
                    </Typography>
                    <br></br>
                    <Divider light variant="middle" />
                    <br></br>
                    <Typography variant="h6">
                      To get started, create a new SmartPiggy using the button below:
                    </Typography>
                    <br></br>
                    <Button variant="contained" color="primary" size="large" onClick={this.handleCreatePiggy}>
                    Create New Piggy
                    {/* This Button uses a Font Icon, see the installation instructions in the docs. */}
                  </Button>
                  </div>
                }

                {/** Search & Buy "component" - should show if the persistent action bar button has been clicked */}
                {this.state.showSearchAndBuy &&
                  <div>
                    <SatisfyAuction blockNumber={this.state.blockNumber}/>
                  </div>
                }

                {/** Claim Payout "component" - should show if the persistent action bar button has been clicked */}
                {this.state.showClaimPayout &&
                  <div>
                    <Claim />
                  </div>
                }

                {/** Approve Transfers "component" - should show if the persistent action bar button has been clicked */}
                {this.state.showApprovals &&
                  <div>
                    <Approvals />
                  </div>
                }

                {/** Faucet "component" - should show if the persistent action bar button has been clicked */}
                {this.state.showFaucet &&
                  <div>
                    <Faucet />
                  </div>
                }

                {/** Create Piggy "component" - should show if a "Create Piggy" button has been clicked on in the list above, or default screen*/}
                {this.state.showCreatePiggy &&
                  <div>
                    <CreatePiggy networkId={this.state.network} />
                    <Divider />
                    <br></br>
                    <Button variant="contained" color="secondary" size="large" style={{marginRight: "10px"}} onClick={this.handleHome}>Cancel</Button>
                  </div>
                }
                {/** Piggy Details "component" - should show if a piggy has been clicked on in the list above*/}
                {this.state.showPiggyDetails &&
                  <div>
                    <div>
                      <ExpansionPanel defaultExpanded={true}>
                        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h5">Core Piggy Details</Typography>
                        </ExpansionPanelSummary>
                        <ExpansionPanelDetails>
                          <Typography variant="h6">Selected Token ID: {this.state.selectedPiggy}</Typography>
                        </ExpansionPanelDetails>
                          <PiggyDetail piggyId={this.state.selectedPiggy} piggies={this.state.piggyDetailMap} />
                      </ExpansionPanel>
                    </div>
                    {/* Auction process */}
                    <div>
                      <Divider />
                      <ExpansionPanel defaultExpanded={this.state.piggyOnAuction}>
                        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h5">Piggy Auction Management</Typography>
                        </ExpansionPanelSummary>
                        <ExpansionPanelDetails>
                          <Typography variant="h6">Current Block: {this.state.blockNumber}</Typography>
                        </ExpansionPanelDetails>
                          {this.state.piggyOnAuction &&
                            <OnAuction
                              tokenId={this.state.selectedPiggy}
                              piggyOnAuction={this.state.piggyOnAuction}
                              startBlock={this.state.startBlock}
                              expiryBlock={this.state.expiryBlock}
                              startPrice={this.state.startPrice}
                              reservePrice={this.state.reservePrice}
                              timeStep={this.state.timeStep}
                              priceStep={this.state.priceStep}
                            />
                          }
                          {!this.state.piggyOnAuction &&
                            <StartAuction tokenId={this.state.selectedPiggy} />
                          }
                      </ExpansionPanel>
                    </div>
                    <div>
                      <Divider />
                      <ExpansionPanel>
                      <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h5">Piggy Clearance and Settlement</Typography>
                        </ExpansionPanelSummary>
                        {this.state.piggyHasBeenCleared &&
                          <Settlement tokenId={this.state.selectedPiggy} />
                        }
                        {!this.state.piggyHasBeenCleared &&
                          <Clearing tokenId={this.state.selectedPiggy} />
                        }
                      </ExpansionPanel>
                    </div>
                  </div>}

                <TXModal networkId={this.state.network} />
              </Paper>
            </Grid>
          </Grid>
        </Grid>


      </div>
    )
  }
}

Home.contextTypes = {
  drizzle: PropTypes.object
}

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    SmartPiggies: state.contracts.SmartPiggies,
    StableToken: state.contracts.StableToken,
    TestnetLINK: state.contracts.TestnetLINK,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  };
};

export default drizzleConnect(Home, mapStateToProps);
