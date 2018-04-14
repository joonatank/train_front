import React, { Component } from 'react';
import './App.css';

const localisation = {
   train_text: "Juna",
   depart_text: "Lähtoasema",
   going_text: "Pääteasema",
   arrive_text: "Saapuu",
   search_text: "Hae aseman nimellä",
   departures_text: "Lähtevät",
   arrivals_text: "Saapuvat"
};

function Search() {
   return (
      <form className="Search-form">
         <p>{localisation.search_text}</p>
         <input type="text" name="search" />
      </form>
   );
}

function TrainList(props) {
   return (
   <table className="Train-table">
      <tr>
         <th>{localisation.train_text}</th>
         <th>{localisation.depart_text}</th>
         <th>{localisation.going_text}</th>
         <th>{localisation.arrive_text}</th>
      </tr>
      <tr>
         <td>TEST</td>
         <td>TEST222</td>
         <td>TEST33333</td>
         <td>TEST33333</td>
      </tr>
   </table>
   );
}

function DirSelector() {
   return (
      <div className="DirSelector">
         <a href="?departures" >{localisation.departures_text}</a>
         <a href="?arrivals" >{localisation.arrivals_text}</a>
      </div>
   );
}

class App extends Component {
  render() {
    return (
      <div className="TrainApp">
        <header className="App-header">
           { /*<img src={logo} className="App-logo" alt="logo" />*/}
             <h1 className="App-title">Aseman junatiedot</h1>
           </header>
        <div className="TrainMain">
           <Search />
           <DirSelector />
           <TrainList />
        </div>
      </div>
    );
  }
}

export default App;
