import React from 'react'
import {DeviceEventEmitter, Image, ImageBackground} from 'react-native'
import CacheHelper from "./CacheHelper";

export default class CacheImage extends React.Component {
    state = {
        finalUri: undefined
    }

    listeners = []

    componentDidMount() {
        const {source} = this.props
        if (!source) return
        const {uri} = source
        if (!uri) return
        CacheHelper.getImagePath(uri).then(({uri: cachePath, task}) => {
            this.task = task
            if (cachePath) this.setState({finalUri: cachePath})
            else {
                this.setState({finalUri: undefined})
                this.listeners.push(DeviceEventEmitter.addListener(CacheHelper.event.render, (originalUri, finalUri) => {
                    if (uri === originalUri) {
                        this.setState({finalUri})
                    }
                }))
            }
        }).catch((e) => {
            this.setState({finalUri: uri})
            CacheHelper.printLog(e)
        })
    }

    componentWillUnmount() {
        //remove listeners
        if (!this.listeners || this.listeners.length === 0) return
        for (let listener of this.listeners) {
            try {
                listener.remove()
            } catch (e) {
                CacheHelper.printLog(e)
            }
        }

        //cancel if task is running
        try {
            if (this.task) this.task.cancel()
        } catch (e) {
            CacheHelper.printLog(e)
        }

    }

    render() {
        const {children, ...props} = this.props
        if (children) {
            return <ImageBackground
                {...props}
                source={{uri: this.state.finalUri}}>
                {children}
            </ImageBackground>
        } else {
            return <Image
                {...props}
                source={{uri: this.state.finalUri}}/>
        }
    }
}