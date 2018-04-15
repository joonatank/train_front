# Example front end app using React
Test it at : [Netlify Deployment](https://jolly-bardeen.netlify.com/)

## What it does
* User searches for a Finnish station (needs exact matches, no autocomplete)
* Retrieves current trains arriving and departing on that station.
* User can change the view (departed/arriving) with tabs.
* Shows the next trains (max 10, usually ~8).

Only Finnish localisation for now.

## How to use
1. Go to: [Netlify Deployment](https://jolly-bardeen.netlify.com/)
2. Write a name of a Finnish city (with a train station) to the search (correct spelling and all that).
3. Press enter or click 'Saapuvat'/'Lähtevät'

## How was it made
* React
* Bootstrapped with [Create React App](https://github.com/facebookincubator/create-react-app).
* Single file: src/App.js (style-sheet in src/App.css)

## Local dev setup
1. clone: https://github.com/joonatank/train_front.git
2. command line: go to the app folder
3. run: npm install
4. run: npm start
5. browser: http://localhost:3000

## How to Deploy
### Netlify
1. Fork this git repo in Github
2. Log in to Netlify
3. Deploy project from Github
    1. build command: npm run build
    2. publish directory: build/

## Known Issues
* Search input only accepts exact matches (case insensitive)
* Search input can only be submitted by pressing Enter (or clicking the view tabs)
* No suggestions or autocomplete in the search
* Mobile version is horrible
    * it's not well designed -> you need to scroll to both directions
    * it's not properly scaled
    * you can't submit form (no button, no enter)
    * time display is wrong (part of minutes is missing)
    * train numbers line break odly
* No tests

