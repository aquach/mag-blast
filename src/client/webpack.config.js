const path = require("path");

module.exports = {
    mode: 'development',
    entry: {
        "client": "./game.tsx",
        "index": "./index.tsx",
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "../../dist"),
    },
};
