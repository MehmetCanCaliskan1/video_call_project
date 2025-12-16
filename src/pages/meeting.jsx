import React from 'react';
import

function meeting() {
    return (
        <div >
            <h1>Toplantıya Katılın</h1>
            <form>
                <label>
                    Toplantı Kodu:
                    <input type="text" name="meetingCode" />
                </label>
                <button type="submit">Katıl</button>
            </form>
        </div>
    );
}

export default meeting;