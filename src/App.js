/*  @author Joonatan Kuosa <joonatan.kuosa@gmail.com>
 *  @date 2018-04-15
 *
 *  Under a copyleft, do what you want with it.
 */

import React, { Component } from 'react';
import './App.css';

const localisation = {
   train_text: "Juna",
   depart_text: "Lähtoasema",
   going_text: "Pääteasema",
   arrives_text: "Saapuu",
   departs_text: "Lähtee",
   search_text: "Hae aseman nimellä",
   departures_text: "Lähtevät",
   arrivals_text: "Saapuvat",
   cancelled_text: 'Peruutettu'
};

// Constants
const STATION_URL = 'https://rata.digitraffic.fi/api/v1/metadata/stations';
const N_RESULTS = 10;
const TRAIN_URL = 'https://rata.digitraffic.fi/api/v1/live-trains/station';

// GLOBALS
// (stationShortName, stationName) map
let g_stations = new Map();

/// Function to retrieve the station list and create a map for it
function getStations() {
   fetch(STATION_URL)
      .then(response => {
            if (response.status !== 200) {
               console.log('Error: ' + response.status);
            }

            response.json().then(data => {
               // Create a map out of the station data
               // since we are using a global clear
               g_stations = new Map();
               data.map(elem => g_stations.set(elem.stationShortCode, elem.stationName));
               console.log('Got ', g_stations.size, ' stations');
            });
         }
      )
      .catch(err => console.log('Fetch Error :-S', err))
}

/// Data type for the train data at a specific station
/// if it's a ghost train (not valid) type == number == null
/// otherwise all fields != null
///
/// @todo
///     A thing about our ghost trains is that it might be waiting on the station
///     say we have a `train that arrived two minutes ago, but is leaving in ten.
///     Of course the cancelled trains that would have been gone 30 minutes ago don't belong here.
class Train {

   // Format we want
   // {TYPE NAME} {START STATION} {END STATION} {ARRIVAL TIME}
   constructor(data, station) {
      const MAX = data.timeTableRows.length-1;

      // find our station
      // only includes trains that haven't passed our station yet
      //    unidentified if it's a ghost train
      //    handles cricular routes (HKI)
      const station_time = data.timeTableRows.find( elem => {
         const et = new Date(elem.liveEstimateTime);
         const st = new Date(elem.scheduledTime);
         const max = (isNaN(et.valueOf()) && et > st) ? et : st;
         return elem.stationShortCode === station
            && max > new Date();
      });

      // Handling ghost trains
      if (!station_time)
      {
         this.type = null;
         this.number = null;
      }
      else
      {
         const live_time = station_time.liveEstimateTime;
         const time = station_time.liveEstimateTime
               ? station_time.liveEstimateTime : station_time.scheduledTime;

         this.type = data.trainType;
         this.number = data.trainNumber;
         this.cancelled = data.cancelled;
         this.start = data.timeTableRows[0].stationShortCode;
         this.end = data.timeTableRows[MAX].stationShortCode;
         this.time = new Date(time);
         this.live_time = new Date(live_time);
      }
   }
}

/// Helpers to handle station name conversion

/// Returns a list of possibilities
/// partial matches
function stationToShortList(name) {
   let arr = [];
   g_stations.forEach( (val, k) => {
      const vl = val.toLowerCase();
      const nl = name.toLowerCase();
      const n = Math.min(vl.length, nl.length);
      if (vl.substring(0, n) === nl.substring(0, n))
      {
         arr.push(k);
      }
   });

   return arr;
}

// Exact matches, single return value
function stationToShort(name) {
   let key = '';
   g_stations.forEach( (val, k) => {
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

/// Returns the long name matching short (three letter) name
function stationToLong(sname) {
   const s = g_stations.get(sname);
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
   const i = str.lastIndexOf(':');
   return str.substring(0, i);
}

/// ------------------------------- REACT ------------------------------------

/// Display time as a React component
/// Displayes two times (one with red flag) if they differ, otherwise only one
/// props:  live (live measurement of train time)
///         scheduled (sheduled train time)
function DisplayTime(props)
{
   // checking equal on strings not on time (time isn't accurate)
   // invalid times aren't null, they are NaN
   // cancelled takes priority
   const lt = props.cancelled
      ? localisation.cancelled_text
      : !isNaN(props.live.valueOf()) ? timeToString(props.live) : null;
   const st = timeToString(props.scheduled);

   return (
      <div>
         {(lt && lt !== st
            ?  <span className='Warning-text'> {lt} <br /> </span>
            : false
         )}
         {st}
      </div>
   );
}

/// React component to display an individual train inside the table
/// @props train (a Train data structure)
/// @return <tr> element containing the Train
function DisplayTrain(props)
{
   const train = props.train;
   const cancelled = train.cancelled;
   return (
      <tr className={cancelled ? 'Train-row-disabled' : 'Train-row'}>
         <td key={String(train.number)+'number'}>{train.type} {train.number}</td>
         <td key={String(train.number)+'start'}>{stationToLong(train.start)}</td>
         <td key={String(train.number)+'end'}>{stationToLong(train.end)}</td>
         <td key={String(train.number)+'time'}>
            <DisplayTime live={train.live_time} scheduled={train.time} cancelled={train.cancelled} />
         </td>
      </tr>
   );
}

/// React component for displaying all the Trains at a specific stations
class TrainList extends Component {
   constructor(props) {
      super(props);
      this.state = {
         trains: [],
         station: "HELL",
      };

      // Local Data: these are not states by design (states async updates caused problems).
      //
      // @todo should this be an enum?
      // valid values 'depart', 'arrive'
      this.direction = 'depart';
      this.search_value = '';

      this.handleChange = this.handleChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.handleDepartures = this.handleDepartures.bind(this);
      this.handleArrivals = this.handleArrivals.bind(this);
   }

   handleChange(event) {
      console.log('Search changed: ' + event.target.value);
      this.search_value = event.target.value;
      // @todo try to find a station that matches the new name
      // then we can find the station without submitting the form (pressing enter)
      //const options = stationToShortList(this.search_value);
      // @todo display the list for autocomplete
      //console.log('Options: ' + options);
   }

   /// @todo this runs a search even if we haven't changed any values
   handleSubmit(event) {
      console.log('Search submitted: ' + this.search_value);
      event.preventDefault();
      this.findStation(this.direction, this.search_value);
   }

   // Queries the Train data for a specific station and direction from the server
   // If changed updates the UI
   //
   // Design
   //   Inputs to this method are passed as parameters
   //   Outputs are saved to React state to trigger a re-render
   //   Does NOT use object data or React states as an input
   //   This design was made because React states weren't updated always when this was called.
   findStation(direction, stationName) {

      const station = stationToShort(stationName);
      console.log('Finding station: ' + station);
      let query_url;
      // @todo cleanup the query it works but looks horrible
      if (direction === 'depart')
      { query_url = TRAIN_URL + '/' + station + '?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=' + N_RESULTS + '&include_nonstopping=false'; }
      else if (direction === 'arrive')
      { query_url = TRAIN_URL + '/' + station + '?arrived_trains=0&arriving_trains=' + N_RESULTS + '&departed_trains=0&departing_trains=0&include_nonstopping=false'; }
      else
      { console.log('ERROR: direction \'' + direction + '\' is not correct'); }

      fetch(query_url)
         .then(response => {
               if (response.status !== 200) {
                  console.log('Error: ' + response.status);
                  return [];
               }

               response.json().then(data => {

                  // JSON to Train objects
                  // filter out null trains (ghosts who already went)
                  // List of trains, sorted by arrival/departure time.
                  const tr = data
                     .map( elem => new Train(elem, station) )
                     .filter( train => train.type );
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

      this.direction = 'depart';
      this.findStation(this.direction, this.search_value);
   }

   handleArrivals(e) {
      e.preventDefault();
      console.log('arrivals was clicked');

      this.direction = 'arrive';
      this.findStation(this.direction, this.search_value);
   }

   // @todo seems like generating unique indentifiers is hard
   render() {
      return (
      <div className='TrainMain'>

      <form className="Search-form" onSubmit={this.handleSubmit}>
         <h3>{localisation.search_text}</h3>
         <input type="text" name="search" autocomplete="off" onChange={this.handleChange} />
      </form>

      <div className="DirSelector">
         <button className={this.direction === 'arrive' ? 'Selected-dir-button' : 'button'}
            onClick={this.handleArrivals}>
            {localisation.arrivals_text}
         </button>
         <button className={this.direction === 'depart' ? 'Selected-dir-button' : 'button'}
            onClick={this.handleDepartures}>
            {localisation.departures_text}
         </button>
      </div>

      <table className="Train-table">
         <thead>
            <tr className='Train-row-disabled'>
               <th>{localisation.train_text}</th>
               <th>{localisation.depart_text}</th>
               <th>{localisation.going_text}</th>
               <th>{this.direction === 'depart' ? localisation.departs_text : localisation.arrives_text}</th>
            </tr>
         </thead>
         <tbody>
         {this.state.trains.map(train =>
               <DisplayTrain train={train} />
         )}
         </tbody>
      </table>
      </div>
      );
   }
}

class App extends Component {
  render() {
    return (
      <div className="TrainApp">
        <header className="App-header">
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
