import React from 'react'
import {DeviceEventEmitter, Image, ImageBackground} from 'react-native'
import CacheHelper from "./CacheHelper";


export default class CacheImage extends React.PureComponent {
    state = {
        source: undefined
    }

    listeners = []

    componentDidUpdate(prevProps) {
        const {source} = this.props
        const {source: prevSource} = prevProps

        if (!source && prevSource) {
            this.updateSource()
            return
        }
        if (source) {
            if (!prevSource) {
                this.update(source.uri)
                return
            }

            if (source.uri != prevSource.uri) {
                this.update(source.uri)
                return
            }
        }
    }

    componentDidMount() {
        const {source} = this.props
        if(source && source.uri) {
            this.update(source.uri)
        }
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
    }

    render() {
        const {children, ...props} = this.props
        if (children) {
            return <ImageBackground
                {...props}
                source={this.state.source}>
                {children}
            </ImageBackground>
        } else {
            return <Image
                {...props}
                source={this.state.source}/>
        }
    }

    /**
     * update state according to source.uri
     * @param uri
     */
    update(uri) {
        //update state when the source.uri is local path
        if (!CacheHelper.pattern.remoteUri.test(uri)) {
            this.setState({source: this.props.source})
            return
        }

        //do cache when source.uri is remote uri
        CacheHelper.getImagePath(uri).then(cachePath => {
            if (cachePath) this.updateSource({uri:cachePath})
            else {
                this.updateSource()
                this.listeners.push(DeviceEventEmitter.addListener(CacheHelper.event.render, (originalUri, cachePath) => {
                    if (uri === originalUri) {
                        this.updateSource({uri: cachePath})
                    }
                }))
            }
        }).catch((e) => {
            this.updateSource({uri})
            CacheHelper.printLog(e)
        })
    }

    /**
     * combine and update source in state
     * @param source
     */
    updateSource(source) {
        if(!this) return
        const {source: prevSource} = this.props
        if (!prevSource || !source) {
            this.setState({source})
            return
        }
        source = Object.assign({}, prevSource, source)
        this.setState({source})
    }
}