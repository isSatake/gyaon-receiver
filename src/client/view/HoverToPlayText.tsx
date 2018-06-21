import * as React from "react"

interface Props {
    src: string,
    text: string
}

interface State {
    audio: HTMLAudioElement
}

export default class HoverToPlayText extends React.Component<Props, State>{
    constructor(props){
        super(props);
    }

    onMouseEnter = () => {
        this.state.audio.play();
    };

    onMouseLeave = () => {
        this.state.audio.pause();
        this.state.audio.currentTime = 0;
    };

    setAudioEl = (el: HTMLAudioElement) => {
        this.setState({
            audio: el
        })
    };

    render(){
        return(
            <span
                onMouseEnter={this.onMouseEnter}
                onMouseLeave={this.onMouseLeave}
                style={{
                    cursor: "pointer"
                }}
                >
                <a href={this.props.src}>{this.props.text}♫</a>
                <audio src={this.props.src} ref={this.setAudioEl}></audio>
            </span>
        )
    }
}