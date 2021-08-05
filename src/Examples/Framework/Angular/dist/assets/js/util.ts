const getBrow = ():string =>{
    const result:any = function () {
        var u = navigator.userAgent, app = navigator.appVersion;
        return {
            // ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
            ios: u.indexOf('iPhone') > -1 || u.indexOf('iPad') > -1,
            android: u.indexOf('Android') > -1 || u.indexOf('Adr') > -1
        };
    }()

    for (let brow in result) {
        if (result[brow]) return brow
    }
    return 'web'
}

export default getBrow