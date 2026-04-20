import React from 'react';
import Keyboard from 'simple-keyboard';
import 'simple-keyboard/build/css/index.css';

class VirtualKeyboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputName: 'email',
      inputValue: '',
    };
    this.keyboard = null;
  }

  componentDidMount() {
    this.keyboard = new Keyboard({
      onChange: input => this.onChange(input),
      onKeyPress: button => this.onKeyPress(button),
      theme: 'hg-theme-default hg-layout-default',
      layout: {
        default: [
          '1 2 3 4 5 6 7 8 9 0 {bksp}',
          'q w e r t y u i o p',
          'a s d f g h j k l {enter}',
          'z x c v b n m @ . {shift}',
          '{space}'
        ],
      },
      display: {
        '{bksp}': '⌫',
        '{enter}': '⏎',
        '{shift}': '⇧',
        '{space}': '␣'
      }
    });
  }

  onChange = (input) => {
    this.setState({ inputValue: input });
    if (this.props.onChange) {
      this.props.onChange(input);
    }
  };

  onKeyPress = (button) => {
    if (button === '{enter}') {
      if (this.props.onEnter) {
        this.props.onEnter(this.state.inputValue);
      }
      if (this.keyboard) this.keyboard.clearInput();
    }
  };

  render() {
    return (
      <div className="virtual-keyboard-container" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', zIndex: 1000 }}>
        <div className="simple-keyboard"></div>
      </div>
    );
  }
}

export default VirtualKeyboard;
