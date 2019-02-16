import React, { Component } from "react";
import { drizzleConnect } from "drizzle-react";

import PropTypes from 'prop-types'

/* import components */
import AppBar from '@material-ui/core/AppBar'
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

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
};

const main = {
  backgroundColor: '#FFCBCB',
  height: '60em',
  width: '50em',
  margin: '1em',
  textAlign: 'center',
  display: 'block',
  padding: 10,
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

class Home extends Component {
  constructor(props, context) {
    super(props)
    this.contracts = context.drizzle.contracts
    this.drizzle = context.drizzle

    this.handleDrawerOpen = this.handleDrawerOpen.bind(this)
    this.handleDrawerClose = this.handleDrawerClose.bind(this)

    this.state = {
      account: '',
      open: true
    }
  }

  componentDidMount() {
    this.setState({
      account: "0x00"
    })
  }

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleDrawerClose = () => {
    this.setState({ open: false });
  };

  render() {

    //console.log(this.props)
    return (
      <div>
      <AppBar
        style={appBar}
        color="default"
      >
      Hello
      </AppBar>
      {/*
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Paper style={leftPane}>
                  {this.props.accounts[0]}
              </Paper>
            </TableCell>
            <TableCell>
              <Paper style={main}>
              </Paper>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      */}
      <Grid container>
        <Grid item>
          <Paper style={leftPane}>
              {this.props.accounts[0]}
          </Paper>
        </Grid>
        <Grid item>
          <Paper style={main}>
          </Paper>
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
    StableLINK: state.contracts.StableLINK,
    drizzleStatus: state.drizzleStatus,
  };
};

export default drizzleConnect(Home, mapStateToProps);
