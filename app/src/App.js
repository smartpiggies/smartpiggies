import React, { Component } from "react";
import { DrizzleProvider } from "drizzle-react";
import { LoadingContainer } from "drizzle-react-components";

import Home from './components/Home'

import "./App.css";

import drizzleOptions from "./drizzleOptions";

class App extends Component {
  render() {
    return (
      <DrizzleProvider options={drizzleOptions}>
        <LoadingContainer>
          <Home />
        </LoadingContainer>
      </DrizzleProvider>
    );
  }
}

export default App;
