import * as React from "react"
import * as ReactDOM from "react-dom"
import Root from "./view/Root"
import {PageData} from "../share/data"

class App extends React.Component<{}, {}> {
    render() {
        return (
            <Root/>
        )
    }
}

window.onload = () => {
    //expressから送信したJSONがwindow.pageDataに格納されている
    ReactDOM.render(<App />, document.getElementById("container"))
};
