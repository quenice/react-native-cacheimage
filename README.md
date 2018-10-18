
# Getting started

## rn-fecth-blob

[rn-fetch-blob](https://github.com/joltup/rn-fetch-blob) is a dependency for this package that you'll need to add to your project. To install, run the following commands:

```
$ npm install rn-fetch-blob --save
$ react-native link rn-fetch-blob
```
And I recommend you install `rn-fetch-blob` base on [official guide](https://github.com/joltup/rn-fetch-blob)

## installation

`$ npm install react-native-rn-cacheimage --save`


# Usage

## Register and unregister

- Before mount the `<CacheImage/>` or `<AnimatedCacheImage/>` component, should initialize and config some base params. Recommend initialize in the `componentDidMount()` inside of the top `react componet` in your App.
- When all components of your App will been unmounted, you should unregister this package. Recommend do this in the `componentWillMount()` inside of the top `react componet` in your App.


```jsx
import React from 'react'
import {AppRegistry} from 'react-native'
import {Provider} from 'react-redux'
import ReduxStore from './src/configuration/reduxStore'
import App from './src/App'
import {CacheHelper} from "react-native-rn-cacheimage";

const store = ReduxStore

class MyApp extends React.Component {
    componentDidMount() {
        CacheHelper.register({overwrite:false}).catch(e => console.log(e))
    }

    componentWillUnmount() {
        CacheHelper.unregister().catch(e=>console.log(e))
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

## Replace `<Image/>` with `<CacheImage/>`

We can use `<CacheImage/>` just like `<Image/>` component, and everything is all the same besides this

```jsx
import {CacheImage} from 'react-native-rn-cacheimage'
export default class Example extends React.Component {
...
	render() {

		return
		(
		...
		<CacheImage
			source={{uri:'https://xxx.xxx'}}
			defaultSource={placeholder._800x400}
			style={styles.image}
		/>
		...
		)

	}
...
}
```


## Replace `<ImageBackground/>` with `<CacheImage/>`

We can use `<ImageBackground/>` just like `<CacheImage/>` component, and everything is all the same besides this

```jsx
import {CacheImage} from 'react-native-rn-cacheimage'

export default class Example extends React.Component {
...
	render() {

		return
		(
		...
		<CacheImage
			source={{uri:'https://xxx.xxx'}}
			defaultSource={placeholder._800x400}
			style={styles.image}
		>
			<Text>Hello World!</Text>
		</CacheImage>
		...
		)

	}
...
}
```

## Replace `<Animated.Image/>` component with `<AnimatedCacheImage/>`

We can use `<AnimatedCacheImage/>` just like `<Animated.Image/>` component, and everything is all the same besides this

```jsx
import {AnimatedCacheImage} from 'react-native-rn-cacheimage'

export default class Example extends React.Component {
...
	render() {

		return
		(
		...
		<AnimatedCacheImage
			source={{uri:'https://xxx.xxx'}}
			defaultSource={placeholder._800x400}
			style={styles.image}
		/>
		...
		)

	}
...
}
```


# API

## Components

About below two components, can see the detail in [Usage](#usage)

- `CacheImage`
- `AnimatedCacheImage`

## CacheHelper


### register(config:Object):Promise\<Void\>

Init necessary things of current package(`react-native-rn-cacheimage`). Should call this method before mount `<CacheImage/>` or `<AnimatedCacheImage/>`. Recommend call this method in the TOP component of your App.

name | desc | defaultValue
---|---|---
`config.overwrite` | Overwirte or not when the pre-cached(be downloaded just now) file has exists in the local path.  | `false`
`config.dirsQuantity` | Quantity of all dirs where cached file be saved in. Recommend set a prime number | `17`

### getImagePath(uri:String):Promise\<ImagePath:Object\>

Get the image cached local path.

name | desc | defaultValue
---|---|---
`uri` | Image uri. example: [https://xxx.xxx/xxx.jpg](#)  |
`ImagePath.uri` | Image cached local path. |
`ImagePath.task` | It's the task that fetch the remote image, and you can call `task.cancel()` to cancel the fetch task manually |

### getCacheSize():Promise\<Number\>

Get the size of used space of all cached images. The unit of result number is `Byte`

### getCacheSizeFormat():Promise\<String\>

Similarity to `getCacheSize()`, and difference is that the result is been formatted.

The format rule is as below:

- `0KB` <= `result` < `1024KB`, format to `KB`, eg: `134KB`
- `result` >= `1024KB`, format to `MB`, eg: `109.3MB`

### clearCache():Promise\<Void\>

Clear all cached images.

### unregister():Promise\<Void\>

Un-register current package, cancel all uncompleted tasks which fetch image.