
# react-native-cacheimage

## Getting started

### rn-fecth-blob

[rn-fetch-blob](https://github.com/joltup/rn-fetch-blob) is a dependency for this package that you'll need to add to your project. To install, run the following commands:

```
$ npm install rn-fetch-blob --save
$ react-native link rn-fetch-blob
```
And I recommend that you install `rn-fetch-blob` base on [official guide](https://github.com/joltup/rn-fetch-blob)

### installation

`$ npm install react-native-cacheimage --save`


## Usage

### initialize

Before use the `CacheImage` component, should initialize and config some base params. Recommend initialize in the `componentDidMount()` inside of the top `react componet` in your App:

***index.js***

```jsx
import React from 'react'
import {AppRegistry} from 'react-native'
import {Provider} from 'react-redux'
import ReduxStore from './src/configuration/reduxStore'
import App from './src/App'
import {CacheHelper} from "react-native-cacheimage";

const store = ReduxStore

class MyApp extends React.Component {
    componentDidMount() {
        CacheHelper.init().catch(e => console.log(e))
    }

    render() {
        return (
            <Provider store={store}>
                <App/>
            </Provider>
        )
    }
}

AppRegistry.registerComponent("YourAppName", () => MyApp);

```

### use as `Image`

***example.js***

```jsx
export default class Example extends React.Component {
...
	render() {
		...
		<CacheImage
			source={{uri:'https://xxx.xxx'}}
			defaultSource={placeholder._800x400}
			style={styles.image}
		/>
		...
	}
...
}
```

## Methods

### `init()`
### `getCacheSize()`
### `getCacheSizeFormat()`
### `clearCache()`
### `getImagePath()`