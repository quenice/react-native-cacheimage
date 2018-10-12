import {AsyncStorage} from "react-native";
import CryptoJS from 'crypto-js'
import RNFetchBlob from 'rn-fetch-blob'

const STORAGE_KEY = 'cache-image-entity'
const TOTAL_DIRECTORYS = 17
const {fs} = RNFetchBlob

const cacheEntity = {
    cacheMap: {},
    latest: false
}

/**
 * 加法hash算法
 * @param value md5字符串
 * @returns {number} 获得值为[0, TOTAL_DIRECTORYS - 1]
 */
const additiveHash = value => {
    let hash = 0
    const chars = value.match(/./g)
    for (let v of chars) {
        hash += parseInt(`0x${v}`, 16)
    }
    return hash % TOTAL_DIRECTORYS
}

/**
 * 图片存储的基本目录
 * @returns {string}
 */
const getImagesCacheDirectory = () => `${fs.dirs.CacheDir}/cache-images`

const getEncryptedInfo = fileOriginalName => {
    const filename = CryptoJS.MD5(fileOriginalName).toString()
    const directory = additiveHash(filename)
    return {filename, directory}
}

/**
 * 图片存储临时目录
 * @returns {string}
 */
const getTmpDir = () => `${getImagesCacheDirectory()}/tmp`


/**
 * get the final image local path
 * @param originalUri
 * @returns {Promise<*>}
 */
const getImagePath = async (originalUri) => {
    if (!originalUri) return undefined
    await _syncStorage2CacheEntity(originalUri)
    let {cacheMap = {}} = cacheEntity
    const cachePath = cacheMap[originalUri]
    if (cachePath) {
        const exists = await fs.exists(cachePath).catch()
        if (exists) return cachePath
        else return await _fetchImage(originalUri).catch()
    }
    return await _fetchImage(originalUri).catch()
}

/**
 * fetch image data from newwork and update cache map
 * @param originalUri
 * @returns {Promise<string>}
 * @private
 */
const _fetchImage = async (originalUri) => {
    const {filename, directory} = getEncryptedInfo(originalUri)
    const tmpPath = `${getTmpDir()}/${filename}`
    const response = await RNFetchBlob.config({
        fileCache: true,
        overwrite: true,
        path: tmpPath
    }).fetch('GET', originalUri).catch()
    console.log(response)
    if (!response) return undefined
    const info = response.info() || {}
    const contentType = info.headers['Content-Type'] || ''
    const matchResult = contentType.match(/image\/(png|jpg|jpeg|bmp|gif|webp|psd);/i)
    const imageType = matchResult && matchResult.length >= 2 ? matchResult[1] : 'png'
    const cacheDir = `${getImagesCacheDirectory()}/${directory}`
    const cachePath = `${cacheDir}/${filename}.${imageType}`
    await _moveImage(cacheDir, tmpPath, cachePath).catch()
    await _saveCacheKey(originalUri, cachePath).catch()
    return cachePath
}

/**
 * move the tmp image file to final local path
 * @param toDir
 * @param from
 * @param to
 * @returns {Promise<void>}
 * @private
 */
const _moveImage = async (toDir, from, to) => {
    const exists = await fs.exists(to).catch()
    if (exists) {
        await fs.unlink(to)
    }
    const isDir = await fs.isDir(toDir).catch()
    if (!isDir) {
        await fs.mkdir(toDir).catch()
    }
    await fs.mv(from, to).catch()
}

/**
 * get the latest CacheEntity
 * @returns {Promise<{update: boolean, map: {}, latest: boolean}>}
 * @private
 */
const _syncStorage2CacheEntity = async () => {
    if (!cacheEntity || !cacheEntity.latest) {
        let entity = await AsyncStorage.getItem(STORAGE_KEY).catch()
        if (entity) {
            try {
                entity = JSON.parse(entity)
            } catch (e) {
                entity = {}
            }
        } else {
            entity = {}
        }
        Object.assign(cacheEntity, entity, {latest: true})
    }
}

/**
 * save the pair of original-image-uri and final-cache-path
 * @param originalUri
 * @param cachePath
 * @returns {Promise<void>}
 * @private
 */
const _saveCacheKey = async (originalUri, cachePath) => {
    await _syncStorage2CacheEntity().catch()
    const {cacheMap = {}} = cacheEntity
    cacheMap[originalUri] = cachePath
    Object.assign(cacheEntity, {cacheMap})
    await _syncCacheEntity2Storage().catch()
}

/**
 * sync save CacheEntity to storage
 * @returns {Promise<void>}
 * @private
 */
const _syncCacheEntity2Storage = async () => {
    if (cacheEntity) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cacheEntity)).catch()
    }
}

/**
 * register cache image service
 * @returns {Promise<void>}
 */
const init = async () => {
    let entity = await AsyncStorage.getItem(STORAGE_KEY).catch()
    if (entity) {
        try {
            entity = JSON.parse(entity)
        } catch (e) {
            entity = {}
        }
    } else {
        entity = {}
    }
    Object.assign(cacheEntity, entity, {latest: true})
}

/**
 * get all files Recursively
 * @param path
 * @returns {Promise<*>}
 */
const getFiles = async (path) => {
    const exists = await fs.exists(path).catch(() => [])
    if (!exists) return []
    const isDir = await fs.isDir(path).catch(() => false)
    if (isDir) {
        const files = await fs.lstat(path)
        if (!files || files.length === 0) return []
        const tasks = []
        for (const file of files) {
            if (file.type === 'file') {
                tasks.push(file)
            } else {
                tasks.push(getFiles(file.path))
            }
        }
        const filesArr = await Promise.all(tasks)
        let allfiles = []
        for (const f of filesArr) {
            allfiles = allfiles.concat(f)
        }
        return allfiles
    } else {
        return [await fs.stat(path)]
    }
}

/**
 * get the cache size. unit:bytes
 * @returns {Promise<number>}
 */
const getCacheSize = async () => {
    const path = getImagesCacheDirectory()
    const files = await getFiles(path)
    if (!files || files.length === 0) return 0
    let size = 0
    for (let file of files) {
        size += parseInt(file.size)
    }
    return size
}

/**
 * get cache size with format
 * @returns {Promise<string>}
 */
const getCacheSizeFormat = async () => {
    const size = await getCacheSize()
    if (size < 1024 * 1024) {
        return `${parseInt(size / 1024)}KB`
    } else {
        return `${Number(size / (1024 * 1024)).toFixed(2)}MB`
    }
}

/**
 * clear cache
 * @returns {Promise<void>}
 */
const clearCache = async () => {
    const path = getImagesCacheDirectory()
    await fs.unlink(path)
    await fs.mkdir(path)
}

export default {
    init,
    getCacheSize,
    getCacheSizeFormat,
    clearCache,
    getImagePath,
}