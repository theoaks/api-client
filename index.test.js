const ApiClient = require('./index')

test('non existent module', () => {
    var apiClient = new ApiClient('https://ucap-sms.loc')

    apiClient.send('', '',{
        method: 'post'
    }).then(resp => {

    }).catch(resp => {
        console.log(resp)
        expect(resp.success).toBe(false)
        expect(resp.statusCode).toBe(404)
    })
})

test('server unavailable', () => {
    var apiClient = new ApiClient('https://server-does-not-exist.com')

    apiClient.send('', '',{
        method: 'post'
    }).then(resp => {

    }).catch(resp => {
        console.log(resp)
        expect(resp.success).toBe(false)
        expect(resp.statusCode).toBe(404)
    })
})