using System;
using System.Net.Sockets;
using System.IO;
using System.Collections.Generic;

class Program
{
    static void Main(string[] args)
    {
        var socket = new TcpClient();
        socket.NoDelay = true;
        socket.Connect("nw.htl-leonding.ac.at", 110);

        var stream = socket.GetStream();
        var rd = new StreamReader(stream);
        var wr = new StreamWriter(stream) { NewLine = "\r\n", AutoFlush = true };

        Console.WriteLine(rd.ReadLine());

        wr.WriteLine("USER u10");
        rd.ReadLine();

        wr.WriteLine("PASS nscsiscool");
        string s = rd.ReadLine();

        if (!s.StartsWith("+OK"))
        {
            Console.WriteLine("Passwort falsch");
            return;
        }

        wr.WriteLine("LIST");

        List<string> list = new List<string>();
        rd.ReadLine();

        while (true)
        {
            s = rd.ReadLine();
            if (s == ".") break;
            list.Add(s);
        }

        int nMails = list.Count;
        Console.WriteLine($"Anzahl Mails: {nMails}");

        for (int i = 1; i <= nMails; i++)
        {
            Console.WriteLine($"\n--- Mail {i} ---");

            wr.WriteLine($"RETR {i}");

            rd.ReadLine();

            string subject = "";
            string from = "";
            string date = "";

            while (true)
            {
                s = rd.ReadLine();

                if (s == null)
                {
                    Console.WriteLine("Verbindung geschlossen");
                    return;
                }

                if (s == "")
                    break;

                if (s.StartsWith("Subject:"))
                    subject = s.Substring(8).Trim();

                else if (s.StartsWith("From:"))
                    from = s.Substring(5).Trim();

                else if (s.StartsWith("Date:"))
                    date = s.Substring(5).Trim();
            }

            while (true)
            {
                s = rd.ReadLine();
                if (s == ".") break;
            }

            Console.WriteLine($"From: {from}");
            Console.WriteLine($"Subject: {subject}");
            Console.WriteLine($"Date: {date}");
        }

        wr.WriteLine("QUIT");
        Console.WriteLine(rd.ReadLine());
    }
}