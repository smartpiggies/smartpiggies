import React, { Component } from "react"
import { drizzleConnect } from "drizzle-react"

import PropTypes from 'prop-types'

/* import components */
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

class ListPiggies extends Component {
  constructor(props, context) {
    super(props)

    this.handleButton = this.handleButton.bind(this)
    this.state = {

    }
  }

  handleButton() {
    console.log(this.props.piggyList)
  }

  render() {

    return (
      <div>
      {this.props.piggyList.map(item => (
        <ListItem button key={item.label} value={item.value} onClick={this.handleButton}>
          <ListItemText>
            {item.label}
          </ListItemText>
            {item.value}
        </ListItem>
      ))}

        </div>
    )
  }
}

ListPiggies.contextTypes = {
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

export default drizzleConnect(ListPiggies, mapStateToProps);
