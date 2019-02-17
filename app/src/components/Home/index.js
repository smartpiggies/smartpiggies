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
import PiggyDetail from '../PiggyDetail'
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon';


import ERC20Stats from '../ERC20Stats';  // try to render this at the top of the left sidebar
//import { Typography } from "@material-ui/core";

import logo from '../../Assets/Logo/logo.png'

/*
background
width
height
padding
border
margin
textAlign
display
*/
const appBar = {
  backgroundColor: 'default',
  height: 50,
  display: 'block',
  padding: 10,
};

const leftPane = {
  backgroundColor: '#FFCBCB',
  //height: 500,
  width: 250,
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

let globalDataKeyGetOwnedPiggies, globalDataKeyGetDetails

class Home extends Component {
  constructor(props, context) {
    super(props)
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.handleDrawerOpen = this.handleDrawerOpen.bind(this)
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

      //datakeys
      dataKeyGetOwnedPiggies: '',
      dataKeyGetDetails: '',
      dataKeyGetActionDetails: '',

      // visibility state management
      // easiest way to handle these is if you have event handlers for clicks that set all to false except the ones that should be true
      piggyOnAuction: false, // PLACEHOLDER FOR TESTING - FETCH LATER
      piggyHasBeenCleared: false,
      showDefaultPage: true,  // should be true on initial load, and if we ever get redirected back here after a special action
      showPiggyDetails: false, // PLACEHOLDER FOR TESTING - DEFAULT SHOULD PROBABLY BE FALSE
      showCreatePiggy: false,
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
        //const dataKeyGetDetails = this.contracts.SmartPiggies.methods['getDetails'].cacheCall()
        // Use the dataKey to display data from the store.
        this.setState({
          dataKeyGetOwnedPiggies: globalDataKeyGetOwnedPiggies,
          //dataKeyGetDetails: dataKeyGetDetails
        })
    }

    this.setState({
      spContractAddress: this.contracts.SmartPiggies.address,
      activeAccount: this.props.accounts[0]
    })
  }

  componentDidUpdate(prevProps) {
    if (this.props.SmartPiggies !== prevProps.SmartPiggies) {
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
      //console.log(piggyAuctionDataKeys.map(items => items.value))
      //console.log(this.props.SmartPiggies[])
      //console.log()
    }
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
    let auctionActive = false
    let result = this.state.piggyAuctionMap.filter(items => items.label === value)
    if (result.length > 0) {
      auctionArray = this.props.SmartPiggies.getAuctionDetails[result[0].value].value
      auctionActive = auctionArray[6]
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

    this.setState({
      piggyId: value,
      showPiggyDetails: true,
      showDefaultPage: false,
      piggyOnAuction: auctionActive
    })
    //console.log(this.props.SmartPiggies.getDetails[dataKey])
    //console.log(dataKey)
  }

  handleCreatePiggy = () => {
    this.setState({
      showDefaultPage: false,
      showPiggyDetails: false,
      showCreatePiggy: true,
    })
  }

  render() {
    //console.log(this.state.ownedPiggies)
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
          <table>
            <tbody>
              <tr>
                <td>Contract:</td>
                <td></td>
                <td>{this.state.spContractAddress}</td>
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
                    <Typography variant="h6">Account:</Typography>
                    {groomedAddress}
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText>
                      <h3>Piggies:</h3>
                    </ListItemText>
                  </ListItem>

                  {piggies}

                </List>
                {/**  ERC-20 information */}
                <ERC20Stats />

              </Paper>
            </Grid>
          </Grid>
          <Divider light />
          <Grid item>
            <Grid container>
              <Paper style={main}>
                {/** Default Screen "component" - should show if all "component state management" bools are false*/}

                {this.state.showDefaultPage &&

                  <div>
                    <img src={logo} alt="drizzle-logo" />
                    <br></br>
                    <Divider light variant="middle" />
                    <br></br>
                    <Typography variant="h5">
                      Welcome to SmartPiggies!
                    </Typography>
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

                {/** Create Piggy "component" - should show if a "Create Piggy" button has been clicked on in the list above, or default screen*/}
                {this.state.showCreatePiggy &&
                  <div>
                    <Paper>
                    <br></br><br></br><br></br><br></br>
                    FORM GOES HERE
                    <br></br><br></br><br></br><br></br>
                    </Paper>
                    <br></br>
                    <Divider />
                    <br></br>
                    <Button variant="contained" color="secondary" size="large" style={{marginRight: "10px"}}>Cancel</Button>
                    <Button variant="contained" color="primary" size="large">Create Piggy</Button>
                  </div>
                }
                {/** Piggy Details "component" - should show if a piggy has been clicked on in the list above*/}
                {this.state.showPiggyDetails &&
                  <div>
                    Current Piggy: {this.state.piggyId}
                    <div>
                      <ExpansionPanel defaultExpanded={true}>
                        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h5">Core Piggy Details</Typography>
                        </ExpansionPanelSummary>
                        <ExpansionPanelDetails>
                          <PiggyDetail piggyId={this.state.piggyId} piggies={this.state.piggyDetailMap} />
                        </ExpansionPanelDetails>
                      </ExpansionPanel>
                    </div>
                    {/* Auction process */}
                    <div>
                      <Divider />
                      <ExpansionPanel defaultExpanded={this.state.piggyOnAuction}>
                        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h5">Piggy Auction Management</Typography>
                        </ExpansionPanelSummary>
                        {this.state.piggyOnAuction &&
                          <ExpansionPanelDetails>
                            <List>
                              Auction Details
                              <ListItem>
                                On auction: {this.state.piggyOnAuction}
                              </ListItem>
                              <ListItem>
                                Start block: 654321
                              </ListItem>
                              <ListItem>
                                Expiry block: 655000
                              </ListItem>
                              <ListItem>
                                Start Price:
                              </ListItem>
                              <ListItem>
                                Reserve Price:
                              </ListItem>
                              <ListItem>
                                Time Step:
                              </ListItem>
                              <ListItem>
                                Price Step:
                              </ListItem>
                            </List>
                          </ExpansionPanelDetails>
                        }
                        {!this.state.piggyOnAuction &&
                          <ExpansionPanelDetails>
                            Form goes here for auction start
                            Button at bottom to "Start Auction" or "cancel" (which clears input fields)
                          </ExpansionPanelDetails>
                        }
                      </ExpansionPanel>
                    </div>
                    <div>
                      <Divider />
                      <ExpansionPanel>
                      <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h5">Piggy Settlement Management</Typography>
                        </ExpansionPanelSummary>
                        {this.state.piggyHasBeenCleared &&
                          <ExpansionPanelDetails>
                          <List>
                            pull in the various auction detail fields here as list items
                            <ListItem>
                              On auction: {this.state.piggyOnAuction}
                            </ListItem>
                            <ListItem>
                              Start block: 654321
                            </ListItem>
                            <ListItem>
                              Expiry block: 655000
                            </ListItem>
                            <ListItem>
                              etc.
                            </ListItem>
                            <ListItem>
                              etc.
                            </ListItem>
                          </List>
                        </ExpansionPanelDetails>
                        }
                        {!this.state.piggyHasBeenCleared &&
                          <ExpansionPanelDetails>
                            <Paper>
                              <br></br><br></br><br></br>
                              EXPLANATION + BUTTON TO CLEAR PIGGY GOES HERE
                              <br></br><br></br><br></br>
                            </Paper>
                          </ExpansionPanelDetails>
                        }
                      </ExpansionPanel>
                    </div>
                  </div>}

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
    RopstenLINK: state.contracts.RopstenLINK,
    drizzleStatus: state.drizzleStatus,
    transactionStack: state.transactionStack,
    transactions: state.transactions
  };
};

export default drizzleConnect(Home, mapStateToProps);
