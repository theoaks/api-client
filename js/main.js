import {ApiClient} from "../src/es6/api-client"

let client = new ApiClient('https://ucap-sms.loc');
client.send('account', 'get_account_types', {
    method: "get",
    query: {
        cat_id: 1
    }
}).then(resp => {
    console.log(resp);
}).catch(error => {
    alert(error.message);
});
