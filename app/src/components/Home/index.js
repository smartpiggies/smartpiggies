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

import ListPiggies from '../ListPiggies'
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
  height: 500,
  width: 250,
  margin: "1em",
  textAlign: 'left',
  display: 'block',
  padding: 10,
  marginTop: '5em'
};

const main = {
  backgroundColor: '#FFCBCB',
  height: '60em',
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

const spArray = [
    {
      label: '1',
      value: '123456'
    },
    {
      label: '2',
      value: '123456',
    },
    {
      label: '3',
      value: '123456'
    },
    {
      label: '4',
      value: '123456'
    }
]

class Home extends Component {
  constructor(props, context) {
    super(props)
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.handleDrawerOpen = this.handleDrawerOpen.bind(this)
    this.handleDrawerClose = this.handleDrawerClose.bind(this)
    this.groomAddress = this.groomAddress.bind(this)

    this.state = {
      activeAccount: '',
      open: true
    }
  }

  componentDidMount() {
    this.setState({
      activeAccount: this.props.accounts[0]
    })
  }


  groomAddress(address) {
    let groomed
    if (address !== '0x0000000000000000000000000000000000000000') {
      groomed = address.slice(0,6)
      groomed = groomed + "...." + address.slice(-4)
    }
    return groomed
  }

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleDrawerClose = () => {
    this.setState({ open: false });
  };

  render() {
    let groomedAddress = this.groomAddress(this.state.activeAccount)
    //console.log(this.props)
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
            <td>{this.props.accounts[0]}</td>
          </tr>
        </tbody>
      </table>
      </AppBar>

      <Grid container style={grid}>
        <Grid item>
          <Grid container>
            <Paper style={leftPane}>
              <List>
                <ListItem>
                  <ListItemText>
                    Account:
                  </ListItemText>
                  {groomedAddress}
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText>
                    <h3>Piggies:</h3>
                  </ListItemText>
                </ListItem>

                <ListPiggies piggyList={spArray} />


              </List>

            </Paper>
          </Grid>
        </Grid>
        <Divider light />
        <Grid item>
          <Grid container>
              <Paper style={main}>
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
    TableTokens: state.contracts.TableTokens,
    StableLink: state.contracts.StableLink,
    drizzleStatus: state.drizzleStatus,
  };
};

export default drizzleConnect(Home, mapStateToProps);
