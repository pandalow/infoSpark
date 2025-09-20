

type PredefinedProps = {
    handleSend: () => void;
    message: string;
};

const Predefined = ({ handleSend, message }: PredefinedProps) => {
    return (
        <div>
            <button onClick={handleSend}>{message}</button>
        </div>
    );
};

export default Predefined;
