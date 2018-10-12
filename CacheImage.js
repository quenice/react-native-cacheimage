import React from 'react'
import {Image, ImageBackground} from 'react-native'
import CacheHelper from "./CacheHelper";

export default class CacheImage extends React.Component {
    state = {
        finalUri: undefined
    }

    componentDidMount() {
        const {source} = this.props
        if (!source) return
        const {uri} = source
        if (!uri) return
        CacheHelper.getImagePath(uri).then(cachePath => {
            if (cachePath) this.setState({finalUri: cachePath})
            else this.setState({finalUri: uri})
        }).catch(() => this.setState({finalUri: uri}))
    }

    render() {
        const {children} = this.props
        if (children) {
            return <ImageBackground
                {...this.props}
                source={{uri: this.state.finalUri}}>
                {children}
            </ImageBackground>
        } else {
            return <Image
                {...this.props}
                source={{uri: this.state.finalUri}}/>
        }
    }
}