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

// Constants
const STATION_URL = 'https://rata.digitraffic.fi/api/v1/metadata/stations';
const STATION = 'TPE'
const N_RESULTS = 10
const TRAIN_URL = 'https://rata.digitraffic.fi/api/v1/live-trains/station'

// Constructred urls
const QUERY_DEPART_URL = TRAIN_URL + '/' + STATION + '?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=' + N_RESULTS + '&include_nonstopping=false';
const QUERY_ARRIVAL_URL = TRAIN_URL + '/' + STATION + '?arrived_trains=0&arriving_trains=' + N_RESULTS + '&departed_trains=0&departing_trains=0&include_nonstopping=false';

// GLOBALS
// @todo mark as a global (shame we can't final this)
// (stationShortName, stationName) map
var stations = new Map();

/// Function to retrieve the station list and create a map for it
/// @todo We want this is a global variable that is intialised at the start
function getStations() {
   // @todo move to constants at the top
   fetch(STATION_URL)
      .then(response => {
            if (response.status !== 200) {
               console.log('Error: ' + response.status);
               return [];
            }

            response.json().then(data => {
               // Create a map out of the station data
               // since we are using a global clear
               stations = new Map();
               data.map(elem => stations.set(elem.stationShortCode, elem.stationName));
               console.log('Got ', stations.size, ' stations');
            });
         }
      )
      .catch(function(err) {
         console.log('Fetch Error :-S', err);
      });
}

function Search() {
   return (
      <form className="Search-form">
         <p>{localisation.search_text}</p>
         <input type="text" name="search" />
      </form>
   );
}

/// Data type for the train data at a specific station
class Train {

   // Format we want
   // {TYPE NAME} {START STATION} {END STATION} {ARRIVAL TIME}
   constructor(data, station) {
      let MAX = data.timeTableRows.length-1;

      // find our station
      let station_time = data.timeTableRows.find( elem => elem.stationShortCode === station);
      console.log(STATION, ' live estimate: ', station_time.liveEstimateTime);
      console.log(STATION, ' scheduled : ', station_time.scheduledTime);
      // @todo we need to add live estimate if it exists and is different from schedule
      // @todo we need to save two values if estimate is different from scheduled
      // @todo we need to deal with cancelled trains
      const time = station_time.scheduledTime;

      this.type = data.trainType;
      this.number = data.trainNumber;
      this.cancelled = data.cancelled;
      // TODO this method of getting start and end points is really bad for HKI traffic
      // circular routes which start and end in HKI
      this.start = data.timeTableRows[0].stationShortCode;
      this.end = data.timeTableRows[MAX].stationShortCode;
      this.time = new Date(time);
   }
}

/// Helpers to handle station name conversion
function stationToShort(name) {
   var key;
   stations.forEach( (val, k) => {
      const vl = val.toLowerCase();
      const nl = name.toLowerCase();
      if (vl == nl || vl == nl + ' asema')
      {
         key = k;
         return;
      }
   });
   return key;
}

function stationToLong(sname) {
   const s = stations.get(sname);
   // Remove asema from names
   // Need to deal with null references
   if (s && s.length > 6)
   { return s.replace(' asema', ''); }
   else
   { return s; }
}

/// React component for displaying all the Trains at a specific stations
class TrainList extends Component {
   constructor(props) {
      super(props);
      this.state = {
         trains: [],
         station: "HELL"
      };
   }

   // Overload
   componentDidMount() {

      fetch(QUERY_DEPART_URL)
         .then(response => {
               if (response.status !== 200) {
                  console.log('Error: ' + response.status);
                  return [];
               }

               response.json().then(data => {

                  // JSON to Train objects
                  // List of trains, sorted by arrival/departure time.
                  const tr = data.map( elem => new Train(elem, STATION) );
                  tr.sort( (a,b) => { return a.time - b.time } );

                  // Update our view
                  this.setState({ trains: tr });
                  this.setState({ station: STATION });
               });
            }
         )
         .catch(function(err) {
            console.log('Fetch Error :-S', err);
         });
   }

   // Table can't render Date type, only strings
   // @todo seems like generating unique indentifiers is hard
   // @todo Fix the Date formatting
   render() {
      return (
      <div>
      <h3>{stationToLong(this.state.station)}</h3>
      <table className="Train-table">
         <thead>
            <tr>
               <th>{localisation.train_text}</th>
               <th>{localisation.depart_text}</th>
               <th>{localisation.going_text}</th>
               <th>{localisation.arrive_text}</th>
            </tr>
         </thead>
         <tbody>
         {this.state.trains.map(train =>
            <tr>
               <td key={String(train.number)+'number'}>{train.type} {train.number}</td>
               <td key={String(train.number)+'start'}>{stationToLong(train.start)}</td>
               <td key={String(train.number)+'end'}>{stationToLong(train.end)}</td>
               <td key={String(train.number)+'time'}>{String(train.time)}</td>
            </tr>
         )}
         </tbody>
      </table>
      <ul>
      </ul>
      </div>
      );
   }
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

// Initialise Globals
// @todo wrong place for the stations
getStations();

export default App;
