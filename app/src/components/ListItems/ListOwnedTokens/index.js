import React, { Component } from 'react'
import { drizzleConnect } from 'drizzle-react'
import PropTypes from 'prop-types'

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

class ListOwnedTokens extends Component {
  constructor(props, context) {
    super(props)

    this.contracts = context.drizzle.contracts

  }

  render() {
    return (
      <div>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell align="left">
              {this.props.index+1}
            </TableCell>
            <TableCell align="right">
              tokenId: {this.props.item.toString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    )
  }
}

ListOwnedTokens.contextTypes = {
  drizzle: PropTypes.object
}

export default drizzleConnect(ListOwnedTokens)
