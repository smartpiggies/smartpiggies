import { drizzleConnect } from 'drizzle-react'
import React, { Children, Component } from 'react'
import PropTypes from 'prop-types'

import logo from '../../Assets/Logo/logo.png'
/*
 * Create component.
 */

class LoadingContainer extends Component {
  render() {
    if (this.props.web3.status === 'failed')
    {
      if (this.props.errorComp) {
        return this.props.errorComp
      }

      return(
          <div className="App">
          <img src={logo} alt="SmartPiggies-logo" />
            <div className="section">
              <h1>OOPS!</h1>
              <p>This browser has no connection to the Ethereum network.</p>
              <p>Please use the Chrome/FireFox extension MetaMask, or dedicated Ethereum browsers Mist or Parity.</p>
              <p>SmartPiggies is currently running on the Ropsten or Rinkeby networks.</p>
            </div>
          </div>
      )
    }

    if (this.props.web3.status === 'initialized' && Object.keys(this.props.accounts).length === 0)
    {
      return(
          <div className="App">
          <img src={logo} alt="SmartPiggies-logo" />
            <div className="section">
              <h1>ARRG!</h1>
              <p><strong>We can't find any Ethereum accounts!</strong></p>
              <p>Please check and make sure Metamask or your browser are pointed at the correct network and your account is unlocked.</p>
              <p>SmartPiggies is currently running on the Ropsten or Rinkeby networks.</p>
            </div>
          </div>
      )
    }

    if (this.props.drizzleStatus.initialized)
    {
      return Children.only(this.props.children)
    }

    if (this.props.loadingComp) {
      return this.props.loadingComp
    }

    return(
        <div className="App">
        <img src={logo} alt="SmartPiggies-logo" />
          <div className="section">
            <h1>Loading SmartPiggies</h1>
            <p>Loading dapp...</p>
          </div>
        </div>
    )
  }
}

LoadingContainer.contextTypes = {
  drizzle: PropTypes.object
}

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    accounts: state.accounts,
    drizzleStatus: state.drizzleStatus,
    web3: state.web3
  }
}

export default drizzleConnect(LoadingContainer, mapStateToProps)
