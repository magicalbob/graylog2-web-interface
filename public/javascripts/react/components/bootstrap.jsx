/** @jsx React.DOM */

// adapted from react examples (https://github.com/facebook/react/tree/master/examples/jquery-bootstrap)
var BootstrapModal = React.createClass({
    componentDidMount: function () {
        // When the component is added, turn it into a modal
        $(this.getDOMNode())
            .modal({backdrop: 'static', keyboard: false, show: false})
    },
    componentWillUnmount: function () {
    },
    close: function () {
        $(this.getDOMNode()).modal('hide');
    },
    open: function () {
        $(this.getDOMNode()).modal('show');
    },
    render: function () {
        var confirmButton = null;
        var cancelButton = null;

        if (this.props.confirm && this.props.onConfirm) {
            confirmButton = (
                <a role="button" className="btn" onClick={this.props.onConfirm}>
                      {this.props.confirm}
                </a>
                );
        }
        if (this.props.cancel && this.props.onCancel) {
            cancelButton = (
                <a role="button" className="btn btn-primary" onClick={this.props.onCancel}>
                      {this.props.cancel}
                </a>
                );
        }

        return (
            <div className="modal hide fade">
                <div className="modal-header">
                    <button
                    type="button"
                    className="close"
                    onClick={this.props.onCancel}
                    dangerouslySetInnerHTML={{__html: '&times'}}
                    />
                        {Array.isArray(this.props.children) ? this.props.children[0] : this.props.children}
                </div>
                <div className="modal-body">
                        {this.props.children[1]}
                </div>
                <div className="modal-footer">
                      {cancelButton}
                      {confirmButton}
                </div>
            </div>
            );
    }
});