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
const N_RESULTS = 10
const TRAIN_URL = 'https://rata.digitraffic.fi/api/v1/live-trains/station'

// Constructred urls
//const QUERY_ARRIVAL_URL = TRAIN_URL + '/' + STATION + '?arrived_trains=0&arriving_trains=' + N_RESULTS + '&departed_trains=0&departing_trains=0&include_nonstopping=false';

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

/// Data type for the train data at a specific station
class Train {

   // Format we want
   // {TYPE NAME} {START STATION} {END STATION} {ARRIVAL TIME}
   constructor(data, station) {
      const MAX = data.timeTableRows.length-1;

      // find our station
      const station_time = data.timeTableRows.find( elem => elem.stationShortCode === station);
      //console.log(station, ' live estimate: ', station_time.liveEstimateTime);
      //console.log(station, ' scheduled : ', station_time.scheduledTime);
      // @todo time has problems in HKI because the station can appear multiple times
      //    in the data, it takes old values, we need to check against current time and filter
      // @todo we need to add live estimate if it exists and is different from schedule
      // @todo we need to save two values if estimate is different from scheduled
      //    have to use a tuple for this, first estimate second real if it exists
      // @todo we need to deal with cancelled trains
      const time = station_time.liveEstimateTime ? station_time.liveEstimateTime : station_time.scheduledTime;

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
      if (vl === nl || vl === nl + ' asema')
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

/// @return time in HOURS:MINUTES format
function timeToString(time) {
   const str = time.toLocaleTimeString();
   // strip seconds
   return str.substring(0, str.length-4);
}

/// React component for displaying all the Trains at a specific stations
class TrainList extends Component {
   constructor(props) {
      super(props);
      this.state = {
         trains: [],
         station: "HELL",
         search_value: "",
         // @todo should this be an enum?
         // valid values 'depart', 'arrive'
         direction: 'depart'
      };

      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleDepartures = this.handleDepartures.bind(this);
      this.handleArrivals = this.handleArrivals.bind(this);
   }

   handleChange(event) {
      console.log('Search changed: ' + event.target.value);
      this.setState({search_value: event.target.value});
      // @todo try to find a station that matches the new name
      // then we can find the station without submitting the form (pressing enter)
   }

   handleSubmit(event) {
      console.log('Search submitted: ' + this.state.search_value);
      event.preventDefault();
      this.findStation(this.state.direction);
   }

   // @todo Don't like that this can be called from places where the direction changes
   //   and places where it doesn't
   //   also this uses and sets state data, it's way too inconsistent.
   //   I'd love to only use state data, but that's not possible since we need to call
   //   this every time the state gets dirty.
   //   Maybe there is a React callback we can use for it? dunno.
   //   I'd just rather use my own data types to hold it and use this to dirty the state
   //   so that React knows to render the component again.
   findStation(direction) {

      const station = stationToShort(this.state.search_value);
      console.log('Finding station: ' + station);
      let query_url;
      // @todo cleanup the query it works but looks horrible
      if (direction === 'depart')
      { query_url = TRAIN_URL + '/' + station + '?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=' + N_RESULTS + '&include_nonstopping=false'; }
      else if (direction === 'arrive')
      { query_url = TRAIN_URL + '/' + station + '?arrived_trains=0&arriving_trains=' + N_RESULTS + '&departed_trains=0&departing_trains=0&include_nonstopping=false'; }
      else
      { console.log('ERROR: direction \'' + this.state.direction + '\' is not correct'); }

      fetch(query_url)
         .then(response => {
               if (response.status !== 200) {
                  console.log('Error: ' + response.status);
                  return [];
               }

               response.json().then(data => {

                  // JSON to Train objects
                  // List of trains, sorted by arrival/departure time.
                  const tr = data.map( elem => new Train(elem, station) );
                  tr.sort( (a,b) => { return a.time - b.time } );

                  // Update our view
                  this.setState({ trains: tr });
                  this.setState({ station: station });
               });
            }
         )
         .catch(function(err) {
            console.log('Fetch Error :-S', err);
         });
   }

   handleDepartures(e) {
      e.preventDefault();
      console.log('departures was clicked');
      // @todo do we need to check that we don't update this needlessly
      // @fixme setState is bad, it doesn't update instantly meaning our
      //    findStation call will be using the old state
      this.setState({ direction: 'depart' });
      this.findStation('depart');
   }

   handleArrivals(e) {
      e.preventDefault();
      console.log('arrivals was clicked');
      // @todo do we need to check that we don't update this needlessly
      // @fixme setState is bad, it doesn't update instantly meaning our
      //    findStation call will be using the old state
      this.setState({ direction: 'arrive' });
      this.findStation('arrive');
   }

   // @todo seems like generating unique indentifiers is hard
   // @todo display delayed time
   // @todo display cancelled trains
   // @todo arrive_text always reads Arrive? or it should read Depart?
   // @todo arrive_text prints old times for Arrivals
   // @todo buttons need to change styles based on are we looking at arrivals or departures
   render() {
      return (
      <div className='TrainMain'>

      <form className="Search-form" onSubmit={this.handleSubmit}>
         <p>{localisation.search_text}</p>
         <input type="text" name="search" value={this.state.value} onChange={this.handleChange} />
      </form>

      <div className="DirSelector">
         <button onClick={this.handleDepartures}>{localisation.departures_text}</button>
         <button onClick={this.handleArrivals}>{localisation.arrivals_text}</button>
      </div>

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
               <td key={String(train.number)+'time'}>{timeToString(train.time)}</td>
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

class App extends Component {
  render() {
    return (
      <div className="TrainApp">
        <header className="App-header">
           { /*<img src={logo} className="App-logo" alt="logo" />*/}
             <h1 className="App-title">Aseman junatiedot</h1>
           </header>
           <TrainList />
      </div>
    );
  }
}

// Initialise Globals
// @todo wrong place for the stations
getStations();

export default App;
