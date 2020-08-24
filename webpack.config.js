const path = require('path');

module.exports = {
    entry: {
        "api-client": "./src/es6/api-client.js",
        app: "./js/main.js"
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "[name].bundle.js"
    },
    devServer: {
        contentBase: "./"
    },
    module: {
        rules: [
            {
                test: /\.js$/, //using regex to tell babel exactly what files to transcompile
                exclude: /node_modules/, // files to be ignored
                use: {
                    loader: 'babel-loader' // specify the loader
                }
            }
        ]
    }
}

